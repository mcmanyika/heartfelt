export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

export function paymentMethodLabel(method: string) {
  return method.replace(/_/g, " ");
}

export function terminalStatusLabel(status: string) {
  switch (status) {
    case "ONLINE":
      return "Online";
    case "OFFLINE":
      return "Offline";
    case "MAINTENANCE":
      return "Maintenance";
    case "DISABLED":
      return "Disabled";
    default:
      return status.replace(/_/g, " ");
  }
}

export function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatTotals(totals: Array<{ currency: string; amount: number }>) {
  if (totals.length === 0) {
    return "—";
  }

  return totals.map((total) => formatAmount(total.amount, total.currency)).join(" · ");
}

export function formatTotalsRecord(totals: Record<string, number>) {
  return formatTotals(
    Object.entries(totals)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, amount]) => ({ currency, amount })),
  );
}

export function displayMemberName(member: {
  first_name?: string | null;
  last_name?: string | null;
  membership_number?: string | null;
}) {
  const name = [member.first_name, member.last_name].filter(Boolean).join(" ").trim();
  return name || member.membership_number || "Unnamed member";
}

export function toDateTimeLocalValue(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function eventRegistrationStatusLabel(status: string) {
  switch (status) {
    case "REGISTERED":
      return "Registered";
    case "ATTENDED":
      return "Attended";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status.replace(/_/g, " ");
  }
}

export function announcementStatusLabel(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "Scheduled";
    case "PUBLISHED":
      return "Published";
    case "EXPIRED":
      return "Expired";
    default:
      return status.replace(/_/g, " ");
  }
}

export function profileStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "SUSPENDED":
      return "Suspended";
    default:
      return status.replace(/_/g, " ");
  }
}

export function auditActionLabel(action: string) {
  return action.replace(/_/g, " ");
}

export function announcementVisibility(publishDate: string, expiryDate: string | null, now = new Date()) {
  const publish = new Date(publishDate);
  const expiry = expiryDate ? new Date(expiryDate) : null;

  if (!Number.isNaN(publish.getTime()) && publish > now) {
    return "SCHEDULED";
  }

  if (expiry && !Number.isNaN(expiry.getTime()) && expiry <= now) {
    return "EXPIRED";
  }

  return "PUBLISHED";
}

export function familyRelationshipLabel(relationship: string) {
  switch (relationship) {
    case "SPOUSE":
      return "Spouse";
    case "PARENT":
      return "Parent";
    case "CHILD":
      return "Child";
    case "SIBLING":
      return "Sibling";
    case "GUARDIAN":
      return "Guardian";
    case "DEPENDENT":
      return "Dependent";
    case "OTHER":
      return "Other";
    default:
      return relationship.replace(/_/g, " ");
  }
}

export function invertFamilyRelationship(relationship: string) {
  switch (relationship) {
    case "PARENT":
      return "CHILD";
    case "CHILD":
      return "PARENT";
    case "GUARDIAN":
      return "DEPENDENT";
    case "DEPENDENT":
      return "GUARDIAN";
    default:
      return relationship;
  }
}

export function membershipStatusLabel(status: string) {
  switch (status) {
    case "VISITOR":
      return "Visitor";
    case "NEW_CONVERT":
      return "New convert";
    case "ACTIVE_MEMBER":
      return "Active";
    case "INACTIVE_MEMBER":
      return "Inactive";
    case "TRANSFERRED":
      return "Transferred";
    default:
      return status;
  }
}
