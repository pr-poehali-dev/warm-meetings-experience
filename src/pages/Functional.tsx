import Footer from "@/components/Footer";
import Header from "@/components/Header";
import FunctionalHero from "@/components/functional/FunctionalHero";
import FunctionalSidebar from "@/components/functional/FunctionalSidebar";
import FunctionalArticle from "@/components/functional/FunctionalArticle";

export default function Functional() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <FunctionalHero />

      <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-12">
          <FunctionalSidebar />
          <FunctionalArticle />
        </div>
      </div>

      <Footer />
    </div>
  );
}
