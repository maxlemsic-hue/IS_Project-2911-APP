export const statusLabels = {
  PENDING_REVIEW: "Pending Review",
  IN_REVIEW: "In Review",
  AVAILABLE_FOR_CONFIRMATION: "Available for Customer Confirmation",
  DECLINED: "Declined",
  AWAITING_PAYMENT: "Awaiting Payment",
  ACCEPTED: "Accepted",
  PROCESSING: "Processing",
  READY: "Ready",
  COMPLETED: "Completed",
};

export type OrderStatus = keyof typeof statusLabels;
const production: OrderStatus[] = [
  "ACCEPTED",
  "PROCESSING",
  "READY",
  "COMPLETED",
];

export function canUploadReceipt(status: OrderStatus) {
  return ["AWAITING_PAYMENT", "ACCEPTED", "PROCESSING", "READY"].includes(
    status,
  );
}

export function productionRank(status: OrderStatus) {
  return production.indexOf(status);
}
