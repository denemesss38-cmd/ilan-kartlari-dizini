import { createFileRoute, redirect } from "@tanstack/react-router";

// Eski /ilan/:id adreslerini yeni detay sayfasına yönlendirir.
export const Route = createFileRoute("/ilan/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/diyarbakir-ilanlar-sayfasi/$id",
      params: { id: params.id },
      replace: true,
    });
  },
});
