import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Product } from '@/lib/types';
import { RowDataPacket } from 'mysql2';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.product_code, p.product_name, p.category_id,
              pc.name AS category_name, p.manufacturer, p.memo,
              p.created_at, p.updated_at
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       WHERE p.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body: Product = await request.json();
    const { product_code, product_name, category_id, manufacturer, memo } = body;

    if (!product_code?.trim()) {
      return NextResponse.json({ error: '商品コードは必須です' }, { status: 400 });
    }
    if (!product_name?.trim()) {
      return NextResponse.json({ error: '商品名は必須です' }, { status: 400 });
    }

    await pool.query(
      `UPDATE products
       SET product_code=?, product_name=?, category_id=?, manufacturer=?, memo=?
       WHERE id=?`,
      [
        product_code.trim(),
        product_name.trim(),
        category_id ?? null,
        manufacturer?.trim() || null,
        memo?.trim() || null,
        id,
      ]
    );
    return NextResponse.json({ id: Number(id) });
  } catch (err: unknown) {
    console.error(err);
    if ((err as NodeJS.ErrnoException & { code?: string }).code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'この商品コードは既に登録されています' }, { status: 409 });
    }
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    await pool.query(`DELETE FROM products WHERE id = ?`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}
