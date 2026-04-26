import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const SECURITY_QUESTION = '统一密保问题：请输入密保答案';
const SECURITY_ANSWER = '123';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, action, username, securityAnswer, newPassword, confirmNewPassword } = await request.json();
    const db = await getDb();

    if (action === 'signup') {
      // Check if user exists
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
  const hashedSecurityAnswer = await bcrypt.hash(SECURITY_ANSWER, 10);
      const userId = randomUUID();

      // Create user
      await db.collection('users').insertOne({
        _id: userId,
        name,
        email,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        role: 'resident',
        dormId: 'dorm1',
        securityQuestion: SECURITY_QUESTION,
        securityAnswer: hashedSecurityAnswer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        user: { id: userId, name, email }
      });
    } else if (action === 'signin') {
      // Find user
      const user = await db.collection('users').findOne({ email });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password as string);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user: { id: String(user._id), name: user.name, email: user.email, avatar: user.avatar, role: user.role }
      });
    } else if (action === 'resetPassword') {
      if (!username || !securityAnswer || !newPassword || !confirmNewPassword) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      if (newPassword !== confirmNewPassword) {
        return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 });
      }

      const user = await db.collection('users').findOne({
        $or: [{ name: username }, { email: username }],
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const savedAnswer = user.securityAnswer as string | undefined;
      const isSecurityAnswerValid = savedAnswer
        ? await bcrypt.compare(securityAnswer, savedAnswer)
        : securityAnswer === SECURITY_ANSWER;

      if (!isSecurityAnswerValid) {
        return NextResponse.json({ error: 'Invalid security answer' }, { status: 401 });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const hashedSecurityAnswer = savedAnswer
        ? savedAnswer
        : await bcrypt.hash(SECURITY_ANSWER, 10);

      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedNewPassword,
            securityQuestion: SECURITY_QUESTION,
            securityAnswer: hashedSecurityAnswer,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Password reset successful',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
