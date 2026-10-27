import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM position_ranks ORDER BY step_order ASC'
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error: unknown) {
    console.error('Error fetching ranks:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step_order, rank_name, category, years = 1, next_rank = null } = body;

    if (!rank_name || !rank_name.trim()) {
      return NextResponse.json({ success: false, error: '직급 명칭은 필수입니다.' }, { status: 400 });
    }

    const orderNum = parseInt(step_order, 10);
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO position_ranks (step_order, rank_name, category, years, next_rank)
       VALUES (?, ?, ?, ?, ?)`,
      [isNaN(orderNum) ? 99 : orderNum, rank_name.trim(), category || '기타', years || 1, next_rank || null]
    );

    return NextResponse.json({
      success: true,
      message: '새로운 직급이 등록되었습니다.',
      insertId: result.insertId,
    });
  } catch (error: unknown) {
    console.error('Error creating rank:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Bulk update ranks (reorder or update next_ranks)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { ranks } = body;

    if (!Array.isArray(ranks)) {
      return NextResponse.json({ success: false, error: '직급 데이터 목록이 필요합니다.' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const item of ranks) {
        if (!item.id) continue;
        await connection.query(
          `UPDATE position_ranks
           SET step_order = ?, rank_name = ?, category = ?, years = ?, next_rank = ?
           WHERE id = ?`,
          [
            item.step_order,
            item.rank_name,
            item.category || '',
            item.years || 1,
            item.next_rank || null,
            item.id,
          ]
        );
      }

      await connection.commit();
      return NextResponse.json({ success: true, message: '직급 체계가 성공적으로 수정되었습니다.' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: unknown) {
    console.error('Error updating ranks:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
