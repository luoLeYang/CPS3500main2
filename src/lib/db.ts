import { MongoClient, Db, Collection, Document } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'dormitory';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

type AnyDb = Omit<Db, 'collection'> & {
  collection: <TSchema extends Document = any>(name: string) => Collection<TSchema>;
};

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb(): Promise<AnyDb> {
  const client = await clientPromise;
  return client.db(dbName) as AnyDb;
}

export function mapDoc<T extends { _id?: unknown }>(doc: T | null): (Omit<T, '_id'> & { id: string }) | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest } as Omit<T, '_id'> & { id: string };
}

export function mapDocs<T extends { _id?: unknown }>(docs: T[]): (Omit<T, '_id'> & { id: string })[] {
  return docs.map((d) => mapDoc(d)!);
}
