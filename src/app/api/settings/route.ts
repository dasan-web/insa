import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value FROM system_settings'
    );

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }

    if (!settings.base_year) {
      await pool.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('base_year', '2026') ON DUPLICATE KEY UPDATE setting_value = '2026'"
      );
      settings.base_year = '2026';
    }

    return NextResponse.json({
      success: true,
      settings,
      base_year: parseInt(settings.base_year, 10) || 2026,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: '설정을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
