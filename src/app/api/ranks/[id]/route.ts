import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    const body = await req.json();
    const { step_order, rank_name, category, years, next_rank } = body;

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE position_ranks
       SET step_order = ?, rank_name = ?, category = ?, years = ?, next_rank = ?
       WHERE id = ?`,
      [step_order, rank_name, category, years, next_rank, numId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: '수정할 직급을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '직급 정보가 수정되었습니다.' });
  } catch (error: unknown) {
    console.error('Error updating rank item:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM position_ranks WHERE id = ?',
      [numId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: '삭제할 직급을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '직급이 삭제되었습니다.' });
  } catch (error: unknown) {
    console.error('Error deleting rank item:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
