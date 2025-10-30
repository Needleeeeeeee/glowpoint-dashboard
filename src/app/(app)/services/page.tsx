import { Service } from "./columns";
import { createClient } from "@/utils/supabase/server";
import ServicesClient from "./services-client";

const getData = async (): Promise<{
  services: Service[];
  categories: string[];
}> => {
  const supabase = await createClient();

  // Fetch services
  const { data: servicesData, error: servicesError } = await supabase.from("Services").select("*");

  if (servicesError) {
    console.error("Error fetching services:", servicesError);
    return { services: [], categories: [] };
  }

  // Fetch categories from ServiceCategories table
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("ServiceCategories")
    .select("db_category, label")
    .order("sort_order");

  if (categoriesError) {
    console.error("Error fetching service categories:", categoriesError);
    return { services: [], categories: [] };
  }

  const services: Service[] = (servicesData || []).map((service) => ({
    id: service.id,
    service: service.service ?? "N/A",
    category: service.category ?? "N/A",
    price: service.price ?? 0,
  }));

  // Extract category names from ServiceCategories
  const categories = (categoriesData || []).map(cat => cat.db_category);

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
