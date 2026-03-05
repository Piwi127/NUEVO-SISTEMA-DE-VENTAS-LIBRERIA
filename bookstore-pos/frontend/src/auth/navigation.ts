export const getLandingRoute = (role: string | null | undefined): string => {
  if (role === "stock") return "/products";
  if (role === "admin" || role === "cashier") return "/pos";
  return "/login";
};
