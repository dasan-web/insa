import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import * as XLSX from 'xlsx';
import { calculate5YearProjections, RankItem } from '@/lib/rankProjection';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') || '';
    const employment_type = searchParams.get('employment_type') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const baseYear = parseInt(searchParams.get('baseYear') || '2026', 10);

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search.trim()) {
      conditions.push('(name LIKE ? OR department LIKE ? OR position_years LIKE ?)');
      const wild = `%${search.trim()}%`;
      params.push(wild, wild, wild);
    }
    if (department && department !== '전체') {
      conditions.push('department = ?');
      params.push(department);
    }
    if (employment_type && employment_type !== '전체') {
      conditions.push('employment_type = ?');
      params.push(employment_type);
    }
    if (status && status !== '전체') {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT id, department, name, employment_type, hire_date, position_years, phone, email, status, notes FROM employees ${whereClause} ORDER BY id ASC`;

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    // Fetch rank items for 5-year projections
    const [rankRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM position_ranks ORDER BY step_order ASC'
    );
    const ranks = rankRows as RankItem[];

    // Map to Korean Excel headers with 5-year projections right after 상태
    const excelData = rows.map((r, idx) => {
      const proj = calculate5YearProjections(r.position_years, ranks, baseYear);
      return {
        'No.': idx + 1,
        '근무부서': r.department || '',
        '사원': r.name || '',
        '사원구분': r.employment_type || '',
        '입사일': r.hire_date || '',
        [`${String(baseYear).slice(-2)}년 연차(기준)`]: proj.baseRank,
        '재직상태': r.status || '',
        [`${baseYear + 1}년 예상`]: proj.y1,
        [`${baseYear + 2}년 예상`]: proj.y2,
        [`${baseYear + 3}년 예상`]: proj.y3,
        [`${baseYear + 4}년 예상`]: proj.y4,
        [`${baseYear + 5}년 예상`]: proj.y5,
        '연락처': r.phone || '',
        '이메일': r.email || '',
        '비고': r.notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 18 }, // 근무부서
      { wch: 12 }, // 사원
      { wch: 12 }, // 사원구분
      { wch: 14 }, // 입사일
      { wch: 14 }, // 기준 연차
      { wch: 10 }, // 재직상태
      { wch: 14 }, // 1년 예상
      { wch: 14 }, // 2년 예상
      { wch: 14 }, // 3년 예상
      { wch: 14 }, // 4년 예상
      { wch: 14 }, // 5년 예상
      { wch: 16 }, // 연락처
      { wch: 22 }, // 이메일
      { wch: 20 }, // 비고
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '임직원_예상직급명단');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `다산_인사정보_${baseYear}년기준_5개년예상직급_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error exporting excel:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
