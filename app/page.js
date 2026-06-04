import { personalData } from "@/utils/data/personal-data";
import AboutSection from "./components/homepage/about";
import Blog from "./components/homepage/blog";
import ContactSection from "./components/homepage/contact";
import HeroSection from "./components/homepage/hero-section";
import Projects from "./components/homepage/projects";
import Skills from "./components/homepage/skills";
import ClientSections from "./components/homepage/client-sections";

async function getData() {
  try {
    const res = await fetch(
      `https://dev.to/api/articles?username=${personalData.devUsername}`,
      // Revalidate hourly instead of failing the build if dev.to is unreachable.
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.error(`Failed to fetch blogs from dev.to: ${res.status}`);
      return [];
    }

    const data = await res.json();

    // dev.to returns a non-array (e.g. an error object) for unknown usernames.
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item) => item?.cover_image)
      .sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error('Error fetching blogs from dev.to:', error.message);
    return [];
  }
}

export default async function Home() {
  const blogs = await getData();

  return (
    <div suppressHydrationWarning >
      <HeroSection />
      <AboutSection />
      <ClientSections />
      <Skills />
      <Projects />
      <Blog blogs={blogs} />
      <ContactSection />
    </div>
  )
}