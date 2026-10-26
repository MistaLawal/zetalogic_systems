import { Hero } from '../sections/Hero';
import { ShopByCategory, FeaturedProducts, ServicesIndex, WhyUs, BusinessBanner, ArrivalsAndOffers, Testimonials, Insights } from '../sections/HomeSections';
import { usePageMeta } from '../lib/seo';

export default function Home() {
  usePageMeta('Zetalogic Systems', 'Buy new and refurbished laptops, software licences and digital tools, or hire Zetalogic Systems for websites, IT consulting and support in Lagos, Nigeria.');
  return (
    <>
      <Hero />
      <ShopByCategory />
      <FeaturedProducts />
      <ServicesIndex />
      <WhyUs />
      <BusinessBanner />
      <ArrivalsAndOffers />
      <Testimonials />
      <Insights />
    </>
  );
}
