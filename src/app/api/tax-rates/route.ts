import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// GET /api/tax-rates          → 全税率一覧
// GET /api/tax-rates?date=... → 指定日付の適用税率
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      // 指定日以前で最新の税率を返す
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id, applicable_from, rate, description
         FROM tax_rates
         WHERE applicable_from <= ?
         ORDER BY applicable_from DESC
         LIMIT 1`,
        [date]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: '該当する税率が見つかりません' }, { status: 404 });
      }
      const row = rows[0];
      return NextResponse.json({
        ...row,
        applicable_from: row.applicable_from instanceof Date
          ? row.applicable_from.toISOString().slice(0, 10)
          : row.applicable_from,
        rate: Number(row.rate),
      });
    }

    // 全件一覧
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, applicable_from, rate, description
       FROM tax_rates
       ORDER BY applicable_from ASC`
    );
    const list = rows.map((r) => ({
      ...r,
      applicable_from: r.applicable_from instanceof Date
        ? r.applicable_from.toISOString().slice(0, 10)
        : r.applicable_from,
      rate: Number(r.rate),
    }));
    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}
