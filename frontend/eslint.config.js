import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/coverage/**', '**/playwright-report/**', '**/test-results/**'],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    name: 'app/architecture-rules',
    // Les vues, composants et stores ne connaissent que les interfaces de services
    // (via `useServices()`), jamais les implémentations mock ni le jeu de données.
    files: ['src/features/**', 'src/stores/**', 'src/components/**', 'src/layouts/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/mocks/*', '@/services/*/mock*', '@/services/*/http*'],
              message:
                'Passer par useServices() (src/services) : les vues ne doivent pas dépendre d’une implémentation.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'app/money-rules',
    files: ['src/**/*.{ts,vue}'],
    ignores: ['src/core/money/**'],
    rules: {
      // Le formatage monétaire passe par src/core/money (formatCents).
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='toFixed']",
          message: 'Pas de toFixed sur des montants : utiliser formatCents() de @/core/money.',
        },
      ],
    },
  },
  skipFormatting,
)
