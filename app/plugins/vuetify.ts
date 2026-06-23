import { h } from 'vue'
import { createVuetify } from 'vuetify'
import { aliases as mdiAliases, mdi } from 'vuetify/iconsets/mdi'
import {
  VAlert,
  VApp,
  VAppBar,
  VAppBarNavIcon,
  VAutocomplete,
  VAvatar,
  VBadge,
  VBanner,
  VBottomSheet,
  VBreadcrumbs,
  VBreadcrumbsItem,
  VBreadcrumbsDivider,
  VBtn,
  VBtnToggle,
  VCard,
  VCardActions,
  VCardItem,
  VCardSubtitle,
  VCardText,
  VCardTitle,
  VCheckbox,
  VChip,
  VCol,
  VContainer,
  VDataTable,
  VDatePicker,
  VDialog,
  VDivider,
  VExpandTransition,
  VFadeTransition,
  VExpansionPanel,
  VExpansionPanels,
  VExpansionPanelText,
  VExpansionPanelTitle,
  VFooter,
  VIcon,
  VImg,
  VList,
  VListItem,
  VListItemSubtitle,
  VListItemTitle,
  VMain,
  VMenu,
  VNavigationDrawer,
  VOverlay,
  VProgressCircular,
  VProgressLinear,
  VRadio,
  VRadioGroup,
  VRow,
  VSelect,
  VSheet,
  VSkeletonLoader,
  VSlider,
  VSnackbar,
  VSpacer,
  VSwitch,
  VTable,
  VTab,
  VTabs,
  VTabsWindow,
  VTabsWindowItem,
  VTextarea,
  VTextField,
  VToolbar,
  VToolbarItems,
  VToolbarTitle,
  VTooltip,
} from 'vuetify/components'
import '~/assets/variables.scss'

import * as directives from 'vuetify/directives'
import colors from 'vuetify/util/colors'

// MDI 7 dropped several brand glyphs (telegram, discord) for trademark reasons,
// so `mdi-telegram` / `mdi-discord` render blank. Ship them as inline-SVG icon
// aliases (`$telegram` / `$discord`). 1em sizing + currentColor means VIcon's
// `size`/`color` props keep working everywhere they're used.
const brandIcon = (path: string) =>
  defineComponent(
    () => () =>
      h('svg', { viewBox: '0 0 24 24', width: '1em', height: '1em', fill: 'currentColor' }, [
        h('path', { d: path }),
      ])
  )

const TelegramIcon = brandIcon(
  'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'
)

const DiscordIcon = brandIcon(
  'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z'
)

export default defineNuxtPlugin(nuxtApp => {
  const vuetify = createVuetify({
    ssr: true,
    icons: {
      defaultSet: 'mdi',
      sets: { mdi },
      aliases: {
        ...mdiAliases,
        telegram: TelegramIcon,
        discord: DiscordIcon,
      },
    },
    components: {
      VApp,
      VMain,
      VContainer,
      VRow,
      VCol,
      VSpacer,
      VDivider,
      VAppBar,
      VAppBarNavIcon,
      VToolbar,
      VToolbarTitle,
      VToolbarItems,
      VNavigationDrawer,
      VFooter,
      VList,
      VListItem,
      VListItemTitle,
      VListItemSubtitle,
      VBtn,
      VBtnToggle,
      VIcon,
      VTextField,
      VTextarea,
      VAutocomplete,
      VSelect,
      VCheckbox,
      VSwitch,
      VMenu,
      VDatePicker,
      VSlider,
      VDataTable,
      VTable,
      VExpandTransition,
      VFadeTransition,
      VCard,
      VCardItem,
      VCardTitle,
      VCardSubtitle,
      VCardText,
      VCardActions,
      VChip,
      VAlert,
      VSnackbar,
      VImg,
      VAvatar,
      VBadge,
      VBreadcrumbs,
      VBreadcrumbsItem,
      VBreadcrumbsDivider,
      VTooltip,
      VProgressLinear,
      VProgressCircular,
      VTab,
      VTabs,
      VTabsWindow,
      VTabsWindowItem,
      VDialog,
      VSheet,
      VExpansionPanels,
      VExpansionPanel,
      VExpansionPanelTitle,
      VExpansionPanelText,
      VRadio,
      VRadioGroup,
      VBottomSheet,
      VBanner,
      VOverlay,
      VSkeletonLoader,
    },
    directives,
    theme: {
      // SSR + first paint default. The client theme plugin / `useThemeMode`
      // switches to the persisted or system preference after hydration.
      defaultTheme: 'dark',
      themes: {
        dark: {
          dark: true,
          colors: {
            // Deep navy canvas. Vuetify left .v-application painting white in dark
            // mode, which bled through transparent sections; an explicit background
            // keeps the whole app shell cohesively dark on every page.
            background: '#0a0e1a',
            surface: '#121a2e',
            primary: colors.blue.darken2,
            accent: '#FFFFFF',
            secondary: colors.amber.darken3,
            info: colors.teal.lighten1,
            warning: colors.amber.base,
            error: colors.deepOrange.accent4,
            success: colors.green.accent3,
            // Link/anchor color: light blue reads on dark surfaces. Paired with
            // the light theme's darker `link` so anchors clear AA in both modes.
            link: '#64b5f6',
          },
        },
        light: {
          dark: false,
          colors: {
            background: '#f6f7f9',
            surface: '#ffffff',
            primary: colors.blue.darken2,
            accent: colors.blue.accent2,
            secondary: colors.amber.darken4,
            info: colors.teal.darken1,
            warning: colors.amber.darken3,
            // Darkened vs the dark-theme tokens so they clear AA (4.5:1) when used
            // as filled chips/badges (white text auto-picked) AND as colored text
            // on white (.text-error etc). darken1 deep-orange (#F4511E, 3.47) and
            // darken2 green (#388E3C, 4.11) both failed on /estado status chips.
            error: colors.deepOrange.darken4,
            success: colors.green.darken3,
            // Darker blue so links clear AA (4.5:1) on white/light surfaces.
            link: '#1565c0',
          },
        },
      },
    },
  })

  nuxtApp.vueApp.use(vuetify)
})
