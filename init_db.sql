CREATE DATABASE IF NOT EXISTS insa_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE insa_db;

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department VARCHAR(100) NOT NULL COMMENT '근무부서',
  name VARCHAR(50) NOT NULL COMMENT '사원 성명',
  employment_type VARCHAR(50) NOT NULL DEFAULT '정직원' COMMENT '사원구분',
  hire_date DATE NULL COMMENT '입사일',
  position_years VARCHAR(50) NULL COMMENT '26년 연차 및 직급',
  phone VARCHAR(50) NULL COMMENT '연락처',
  email VARCHAR(100) NULL COMMENT '이메일',
  status VARCHAR(20) NOT NULL DEFAULT '재직' COMMENT '재직상태 (재직, 휴직, 퇴사)',
  notes TEXT NULL COMMENT '비고',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dept (department),
  INDEX idx_name (name),
  INDEX idx_employment_type (employment_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
