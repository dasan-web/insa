USE insa_db;

CREATE TABLE IF NOT EXISTS position_ranks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  step_order INT NOT NULL COMMENT '진급 순서 번호 (낮을수록 시작 직급)',
  rank_name VARCHAR(50) NOT NULL UNIQUE COMMENT '직급 및 연차 명칭',
  category VARCHAR(30) NULL COMMENT '직급 대분류 (사원, 주임, 선임I, 선임II, 책임, 수석, 임원)',
  years INT NOT NULL DEFAULT 1 COMMENT '해당 직급 내 연차',
  max_years INT NOT NULL DEFAULT 1 COMMENT '해당 직급 최대 연차',
  next_rank VARCHAR(50) NULL COMMENT '다음 연도 승급 직급',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
