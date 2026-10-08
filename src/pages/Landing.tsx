import { MotionConfig } from 'framer-motion'
import NameDialog from '../components/auth/NameDialog'
import DemoStrip from '../components/landing/DemoStrip'
import FeaturesGrid from '../components/landing/FeaturesGrid'
import FinalCta from '../components/landing/FinalCta'
import Footer from '../components/landing/Footer'
import Hero from '../components/landing/Hero'
import HowItWorks from '../components/landing/HowItWorks'
import Navbar from '../components/landing/Navbar'
import UnderTheHood from '../components/landing/UnderTheHood'

export default function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        className="sr-only z-[70] rounded-lg bg-chalk px-4 py-2 font-semibold text-board focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="chalk-dust" aria-hidden="true" />
      <Navbar />
      <main id="main">
        <Hero />
        <DemoStrip />
        <HowItWorks />
        <FeaturesGrid />
        <UnderTheHood />
        <FinalCta />
      </main>
      <Footer />
      <NameDialog />
    </MotionConfig>
  )
}
