import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Receipt, ReceiptItem } from '@/lib/types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.store_name, r.purchase_date, r.tax_rate_id,
              t.rate AS tax_rate, t.description AS tax_rate_description,
              r.subtotal, r.tax_amount, r.total_amount, r.memo,
              r.created_at, r.updated_at
       FROM receipts r
       JOIN tax_rates t ON t.id = r.tax_rate_id
       ORDER BY r.purchase_date DESC, r.id DESC`
    );
    const receipts = rows.map((r) => ({
      ...r,
      purchase_date: r.purchase_date instanceof Date
        ? r.purchase_date.toISOString().slice(0, 10)
        : r.purchase_date,
      tax_rate: Number(r.tax_rate),
    }));
    return NextResponse.json(receipts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Receipt = await request.json();
    const { store_name, purchase_date, tax_rate_id, subtotal, tax_amount, total_amount, memo, items } = body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO receipts (store_name, purchase_date, tax_rate_id, subtotal, tax_amount, total_amount, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [store_name, purchase_date, tax_rate_id, subtotal, tax_amount, total_amount, memo || '']
      );
      const receiptId = result.insertId;

      if (items && items.length > 0) {
        const itemValues = items.map((item: ReceiptItem) => [
          receiptId,
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
      return NextResponse.json({ id: receiptId }, { status: 201 });
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
