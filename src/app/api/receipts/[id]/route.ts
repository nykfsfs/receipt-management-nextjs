import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Receipt, ReceiptItem } from '@/lib/types';
import { RowDataPacket } from 'mysql2';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.store_name, r.purchase_date, r.tax_rate_id,
              t.rate AS tax_rate, t.description AS tax_rate_description,
              r.subtotal, r.tax_amount, r.total_amount, r.memo,
              r.created_at, r.updated_at
       FROM receipts r
       JOIN tax_rates t ON t.id = r.tax_rate_id
       WHERE r.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, receipt_id, product_code, item_name, quantity, unit_price, amount,
              item_tax_rate, item_tax_amount
       FROM receipt_items WHERE receipt_id = ? ORDER BY id`,
      [id]
    );

    const receipt = {
      ...rows[0],
      purchase_date: rows[0].purchase_date instanceof Date
        ? rows[0].purchase_date.toISOString().slice(0, 10)
        : rows[0].purchase_date,
      tax_rate: Number(rows[0].tax_rate),
      items: itemRows.map((i) => ({ ...i, item_tax_rate: Number(i.item_tax_rate) })),
    };

    return NextResponse.json(receipt);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body: Receipt = await request.json();
    const { store_name, purchase_date, tax_rate_id, subtotal, tax_amount, total_amount, memo, items } = body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE receipts
         SET store_name=?, purchase_date=?, tax_rate_id=?,
             subtotal=?, tax_amount=?, total_amount=?, memo=?
         WHERE id=?`,
        [store_name, purchase_date, tax_rate_id, subtotal, tax_amount, total_amount, memo || '', id]
      );

      await conn.query(`DELETE FROM receipt_items WHERE receipt_id = ?`, [id]);

      if (items && items.length > 0) {
        const itemValues = items.map((item: ReceiptItem) => [
          id,
          item.product_code || null,
          item.item_name,
          item.quantity,
          item.unit_price,
          item.amount,
          item.item_tax_rate,
          item.item_tax_amount,
        ]);
        await conn.query(
          `INSERT INTO receipt_items
             (receipt_id, product_code, item_name, quantity, unit_price, amount, item_tax_rate, item_tax_amount)
           VALUES ?`,
          [itemValues]
        );
      }

      await conn.commit();
      return NextResponse.json({ id: Number(id) });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    await pool.query(`DELETE FROM receipts WHERE id = ?`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}
