import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import HomeLayout from './HomeLayout.vue'
import './styles.css'

// Layout components
import AppHeader from '../../src/components/layout/AppHeader.vue'
import AppFooter from '../../src/components/layout/AppFooter.vue'

// Section components
import HeroSection from '../../src/components/sections/HeroSection.vue'
import PainPointsSection from '../../src/components/sections/PainPointsSection.vue'
import ArchitectureSection from '../../src/components/sections/ArchitectureSection.vue'
import FeaturesSection from '../../src/components/sections/FeaturesSection.vue'
import ChannelsSection from '../../src/components/sections/ChannelsSection.vue'
import PreviewSection from '../../src/components/sections/PreviewSection.vue'
import TechStackSection from '../../src/components/sections/TechStackSection.vue'
import DeploySection from '../../src/components/sections/DeploySection.vue'
import ChangelogSection from '../../src/components/sections/ChangelogSection.vue'

// UI components
import FeatureCard from '../../src/components/ui/FeatureCard.vue'
import ChannelCard from '../../src/components/ui/ChannelCard.vue'
import CodeBlock from '../../src/components/ui/CodeBlock.vue'

const theme: Theme = {
  extends: DefaultTheme,
  Layout: HomeLayout,
  enhanceApp({ app }) {
    // Register all custom components globally
    app.component('AppHeader', AppHeader)
    app.component('AppFooter', AppFooter)
    app.component('HeroSection', HeroSection)
    app.component('PainPointsSection', PainPointsSection)
    app.component('ArchitectureSection', ArchitectureSection)
    app.component('FeaturesSection', FeaturesSection)
    app.component('ChannelsSection', ChannelsSection)
    app.component('PreviewSection', PreviewSection)
    app.component('TechStackSection', TechStackSection)
    app.component('DeploySection', DeploySection)
    app.component('ChangelogSection', ChangelogSection)
    app.component('FeatureCard', FeatureCard)
    app.component('ChannelCard', ChannelCard)
    app.component('CodeBlock', CodeBlock)
  }
}

export default theme
