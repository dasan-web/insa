import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: '삭제할 사원을 선택해주세요.' }, { status: 400 });
    }

    const validIds = ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    if (validIds.length === 0) {
      return NextResponse.json({ success: false, error: '유효한 사원 ID가 없습니다.' }, { status: 400 });
    }

    const placeholders = validIds.map(() => '?').join(',');
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM employees WHERE id IN (${placeholders})`,
      validIds
    );

    return NextResponse.json({
      success: true,
      message: `${result.affectedRows}명의 사원 정보가 성공적으로 삭제되었습니다.`,
      affectedRows: result.affectedRows,
    });
  } catch (error: unknown) {
    console.error('Error batch deleting employees:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
