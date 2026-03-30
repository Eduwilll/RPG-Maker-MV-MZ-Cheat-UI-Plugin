import ItemTableTab from './ItemTableTab.js'
import {TRANSLATE_SETTINGS, TRANSLATION_BANK} from '../js/TranslateHelper.js'

export default {
    name: 'ArmorSettingPanel',

    components: {
        ItemTableTab
    },

    template: `
<v-card flat class="ma-0 pa-0">
    <item-table-tab
        :items="items"
        :headers="headers"
        :as-table-data="convertToTableData"
        :searchable-attrs="['name', 'desc']">
        
    </item-table-tab>
</v-card>
    `,

    data () {
        return {
            items: [],

            headers: [
                {
                    text: 'Name',
                    value: 'name'
                },
                {
                    text: 'Description',
                    value: 'desc'
                }
            ]
        }
    },

    created () {
        this.initializeVariables()

        this._translateListener = () => {
            if (TRANSLATE_SETTINGS.isArmorTranslateEnabled && TRANSLATE_SETTINGS.isArmorTranslateEnabled()) {
                this.initializeVariables()
            }
        }
        window.addEventListener('cheat-translate-finish', this._translateListener)
    },

    beforeDestroy () {
        if (this._translateListener) {
            window.removeEventListener('cheat-translate-finish', this._translateListener)
        }
    },

    methods: {
        initializeVariables () {
            this.items = $dataArmors.slice()
        },

        convertToTableData (item) {
            let translatedName = item.name
            let translatedDesc = item.description

            if (TRANSLATE_SETTINGS.getTargets().armors) {
                if (item.name && item.name.trim()) {
                    const cachedName = TRANSLATION_BANK.get(item.name)
                    if (cachedName) translatedName = cachedName.translated
                }
                
                if (item.description && item.description.trim()) {
                    const cachedDesc = TRANSLATION_BANK.get(item.description)
                    if (cachedDesc) translatedDesc = cachedDesc.translated
                }
            }

            return {
                name: translatedName,
                desc: translatedDesc
            }
        }
    }
}
