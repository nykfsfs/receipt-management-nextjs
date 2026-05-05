import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Product } from '@/lib/types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const SELECT_PRODUCT = `
  SELECT p.id, p.product_code, p.product_name, p.category_id,
         pc.name AS category_name, p.manufacturer, p.memo,
         p.created_at, p.updated_at
  FROM products p
  LEFT JOIN product_categories pc ON pc.id = p.category_id
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const search = searchParams.get('search') ?? '';
    const categoryId = searchParams.get('category_id');

    // 商品コードで単一検索
    if (code) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `${SELECT_PRODUCT} WHERE p.product_code = ?`,
        [code]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
      return NextResponse.json(rows[0]);
    }

    // 一覧検索
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (search) {
      conditions.push('(p.product_code LIKE ? OR p.product_name LIKE ? OR p.manufacturer LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (categoryId) {
      conditions.push('p.category_id = ?');
      values.push(Number(categoryId));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query<RowDataPacket[]>(
      `${SELECT_PRODUCT} ${where} ORDER BY p.product_code LIMIT 200`,
      values
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Product = await request.json();
    const { product_code, product_name, category_id, manufacturer, memo } = body;

    if (!product_code?.trim()) {
      return NextResponse.json({ error: '商品コードは必須です' }, { status: 400 });
    }
    if (!product_name?.trim()) {
      return NextResponse.json({ error: '商品名は必須です' }, { status: 400 });
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO products (product_code, product_name, category_id, manufacturer, memo)
       VALUES (?, ?, ?, ?, ?)`,
      [
        product_code.trim(),
        product_name.trim(),
        category_id ?? null,
        manufacturer?.trim() || null,
        memo?.trim() || null,
      ]
    );
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (err: unknown) {
    console.error(err);
    if ((err as NodeJS.ErrnoException & { code?: string }).code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'この商品コードは既に登録されています' }, { status: 409 });
    }
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}
