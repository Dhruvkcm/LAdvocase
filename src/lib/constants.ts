export const GUJARAT_DISTRICTS = [
  "Ahmedabad",
  "Amreli",
  "Anand",
  "Aravalli",
  "Banaskantha",
  "Bharuch",
  "Bhavnagar",
  "Botad",
  "Chhota Udaipur",
  "Dahod",
  "Dang",
  "Devbhoomi Dwarka",
  "Gandhinagar",
  "Gir Somnath",
  "Jamnagar",
  "Junagadh",
  "Kheda",
  "Kutch",
  "Mahisagar",
  "Mehsana",
  "Morbi",
  "Narmada",
  "Navsari",
  "Panchmahal",
  "Patan",
  "Porbandar",
  "Rajkot",
  "Sabarkantha",
  "Surat",
  "Surendranagar",
  "Tapi",
  "Vadodara",
  "Valsad",
] as const;

export const COURTS = ["JMFC Court", "Sessions Court", "High Court"] as const;

export const CASE_TYPES = [
  "Civil",
  "Criminal",
  "Family",
  "Property",
  "Consumer",
  "Labour",
  "Corporate",
  "Tax",
  "Other",
] as const;

export const CASE_STATUSES = ["pending", "disposed"] as const;

export const ROLE_LABELS: Record<string, string> = {
  owner: "Firm Owner",
  advocate: "Firm Advocate",
  senior_advocate: "Senior Advocate",
  junior_advocate: "Junior Advocate",
  receptionist: "Receptionist",
  accountant: "Accountant",
  office_manager: "Office Manager",
};
