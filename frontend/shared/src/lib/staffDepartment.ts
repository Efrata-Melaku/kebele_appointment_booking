export type ServiceWithDepartment = {
  id: number;
  name: string;
  departmentId: number;
  departmentName?: string;
  department?: { id: number; name: string } | null;
};

function departmentLabel(s: ServiceWithDepartment): string | undefined {
  return s.departmentName ?? s.department?.name;
}

export type ResolvedDepartment =
  | { kind: 'none' }
  | { kind: 'single'; departmentId: number; departmentName: string }
  | { kind: 'conflict'; departmentNames: string[] };

export function resolveDepartmentFromServices(
  services: ServiceWithDepartment[],
  serviceIds: number[]
): ResolvedDepartment {
  const selected = services.filter((s) => serviceIds.includes(s.id));
  if (selected.length === 0) return { kind: 'none' };

  const byDept = new Map<number, string>();
  for (const s of selected) {
    const deptId = s.departmentId ?? s.department?.id;
    const deptName = departmentLabel(s);
    if (deptId != null && deptName) {
      byDept.set(deptId, deptName);
    }
  }

  if (byDept.size === 0) return { kind: 'none' };
  if (byDept.size > 1) {
    return { kind: 'conflict', departmentNames: [...byDept.values()] };
  }

  const [departmentId, departmentName] = [...byDept.entries()][0];
  return { kind: 'single', departmentId, departmentName };
}
