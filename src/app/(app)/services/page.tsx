import { Service } from "./columns";
import { createClient } from "@/utils/supabase/server";
import ServicesClient from "./services-client";

const getData = async (): Promise<{
  services: Service[];
  categories: string[];
}> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("Services").select("*");

  if (error) {
    console.error("Error fetching services:", error);
    return { services: [], categories: [] };
  }

  if (!data) {
    return { services: [], categories: [] };
  }

  const services: Service[] = data.map((service) => ({
    id: service.id,
    service: service.service ?? "N/A",
    category: service.category ?? "N/A",
    price: service.price ?? 0,
  }));

  const categoryMap = new Map<string, string>();
  services.forEach((s) => {
    if (s.category && s.category !== "N/A") {
      const lowerCaseCategory = s.category.toLowerCase();
      if (!categoryMap.has(lowerCaseCategory)) {
        // Store the original casing but use lowercase for uniqueness check
        categoryMap.set(lowerCaseCategory, s.category);
      }
    }
  });

  const categories = Array.from(categoryMap.values()).filter(
    (c) => c.toLowerCase() !== "other"
  );

  return { services, categories };
};
const ServicesPage = async () => {
  const { services, categories } = await getData();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("Profiles")
      .select("isAdmin")
      .eq("email", user.email)
      .single();
    isAdmin = profile?.isAdmin || false;
  }

  return (
    <ServicesClient services={services} categories={categories} isAdmin={isAdmin} />
  );
};

export default ServicesPage;
