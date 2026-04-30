import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const SECURITY_QUESTION = '统一密保问题：请输入密保答案';
const SECURITY_ANSWER = '123';

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      action,
      username,
      securityAnswer,
      newPassword,
      confirmNewPassword,
      inviteCode,
      noInviteCode,
    } = body;
    
    const db = await getDb();

    if (action === 'signup') {
      if (!name || !email || !password) {
        return NextResponse.json({ error: 'Missing required signup fields' }, { status: 400 });
      }

      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }

      const normalizedInvite = String(inviteCode || '').trim().toLowerCase();
      if (!noInviteCode && !normalizedInvite) {
        return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
      }

      let dormId = '';
      let assignedInviteCode = '';
      let createdDormInviteCode: string | null = null;

      if (noInviteCode) {
        dormId = randomUUID(); // 这里作为业务逻辑上的 ID
        let candidate = generateInviteCode();
        let exists = await db.collection('dorms').findOne({ inviteCode: candidate });
        while (exists) {
          candidate = generateInviteCode();
          exists = await db.collection('dorms').findOne({ inviteCode: candidate });
        }

        assignedInviteCode = candidate;
        createdDormInviteCode = candidate;

        // 修复点：让 MongoDB 自动生成 _id，手动指定业务 ID 字段
        await db.collection('dorms').insertOne({
          dormUuid: dormId, // 使用业务字段名，避免覆盖 _id
          inviteCode: assignedInviteCode,
          createdBy: name,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        let dorm = await db.collection('dorms').findOne({ inviteCode: normalizedInvite });
        if (!dorm && normalizedInvite === 'dorm1') {
          // 这里的 _id 使用了字符串 'dorm1'，如果报错，请确保 db 类型定义支持 string _id
          await db.collection('dorms').updateOne(
            { _id: 'dorm1' as any }, 
            {
              $setOnInsert: {
                inviteCode: 'dorm1',
                createdBy: 'system',
                createdAt: new Date(),
              },
              $set: { updatedAt: new Date() },
            },
            { upsert: true }
          );
          dorm = await db.collection('dorms').findOne({ _id: 'dorm1' as any });
        }

        if (!dorm) {
          return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
        }
        dormId = String(dorm._id);
        assignedInviteCode = String((dorm as any).inviteCode || normalizedInvite);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const hashedSecurityAnswer = await bcrypt.hash(SECURITY_ANSWER, 10);
      const userId = randomUUID();

      // 修复核心点：移除 _id 赋值，改用 uuid 字段
          await db.collection('users').insertOne({
            uuid: userId, // 存储你的 UUID
        name,
        email,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        role: 'resident',
        dormId,
        securityQuestion: SECURITY_QUESTION,
        securityAnswer: hashedSecurityAnswer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        user: { id: userId, name, email, dormId, inviteCode: assignedInviteCode, createdDormInviteCode }
      });

    } else if (action === 'signin') {
      const user = await db.collection('users').findOne({ email });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

      const isValid = await bcrypt.compare(password, user.password as string);
      if (!isValid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

      return NextResponse.json({
        success: true,
        user: {
          id: String(user.uuid || user._id), // 优先返回你的业务 UUID
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          dormId: user.dormId,
        }
      });
    }
    // ... resetPassword 逻辑保持一致，注意使用 (user._id as any) 绕过类型检查
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}