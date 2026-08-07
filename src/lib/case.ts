export function formatCaseNumber(
    caseCode: string | null | undefined,
    caseSerial: string | null | undefined,
    caseYear: number | string | null | undefined,
  ) {
    if (!caseCode || !caseSerial || !caseYear) {
      return "—";
    }
  
    return `${caseCode}/${caseSerial}/${caseYear}`;
  }