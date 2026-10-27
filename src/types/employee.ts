export interface Employee {
  id: number;
  department: string;
  name: string;
  employment_type: string;
  hire_date: string | null;
  position_years: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  projections?: {
    baseRank?: string;
    y1?: string;
    y2?: string;
    y3?: string;
    y4?: string;
    y5?: string;
    y2027?: string;
    y2028?: string;
    y2029?: string;
    y2030?: string;
    y2031?: string;
  };
}

export interface EmployeeFormData {
  department: string;
  name: string;
  employment_type: string;
  hire_date: string;
  position_years: string;
  phone: string;
  email: string;
  status: string;
  notes: string;
}

export interface HRStats {
  totalEmployees: number;
  totalDepartments: number;
  statusDistribution: { status: string; count: number }[];
  employmentTypeDistribution: { employment_type: string; count: number }[];
  topDepartments: { department: string; count: number }[];
  recentEmployees: Employee[];
}

export interface RankItem {
  id: number;
  step_order: number;
  rank_name: string;
  category: string | null;
  years: number;
  next_rank: string | null;
  created_at?: string;
  updated_at?: string;
}
