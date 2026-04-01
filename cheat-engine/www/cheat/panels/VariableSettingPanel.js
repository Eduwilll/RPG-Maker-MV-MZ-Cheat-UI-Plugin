import {TRANSLATE_SETTINGS, TRANSLATOR, TRANSLATION_BANK, TRANSLATE_PROGRESS} from '../js/TranslateHelper.js'

export default {
    name: 'VariableSettingPanel',

    template: `
<v-card flat class="ma-0 pa-0">
    <v-data-table
        v-if="tableHeaders"
        denses
        :headers="tableHeaders"
        :items="filteredTableItems"
        :search="search"
        :custom-filter="tableItemFilter"
        :items-per-page="5">
        <template v-slot:top>
            <v-text-field
                label="Search..."
                solo
                background-color="grey darken-3"
                v-model="search"
                dense
                hide-details
                @keydown.self.stop
                @focus="$event.target.select()">
            </v-text-field>
            <v-row
                class="ma-0 pa-0">
                <v-col
                    cols="12"
                    md="12">
                    <v-checkbox
                        v-model="excludeNameless"
                        dense
                        hide-details
                        label="Hide Nameless Items">
                    </v-checkbox>
                </v-col>
            </v-row>
        </template>
        <template
            v-slot:item.value="{ item }">
            <v-text-field
                background-color="grey darken-3"
                class="d-inline-flex"
                height="10"
                style="width: 60px;"
                hide-details
                solo
                v-model="item.value"
                label="Value"
                dense
                @keydown.self.stop
                @change="onItemChange(item)"
                @focus="$event.target.select()">
            </v-text-field>
        </template>
    </v-data-table>
    
    <v-tooltip
        bottom>
        <span>Reload variables and translations</span>
        <template v-slot:activator="{ on, attrs }">
            <v-btn
                style="top: 0px; right: 0px;"
                color="pink"
                dark
                small
                absolute
                top
                right
                fab
                v-bind="attrs"
                v-on="on"
                @click="manualRefresh">
                <v-icon>mdi-refresh</v-icon>
            </v-btn>
        </template>
    </v-tooltip>
</v-card>
    `,

    data () {
        return {
            search: '',
            excludeNameless: false,

            // Store original data separately from display data
            originalVariableNames: [],
            isInitialized: false,

            tableHeaders: [
                {
                    text: 'Name',
                    value: 'displayName'
                },
                {
                    text: 'Value',
                    value: 'value'
                }
            ],
            tableItems: []
        }
    },

    created () {
        this.initializeVariables()

        // Listen for global translation trigger
        this._translateListener = () => {
            if (TRANSLATE_SETTINGS.isVariableTranslateEnabled()) {
                this.manualRefresh()
            }
        }
        window.addEventListener('cheat-translate-finish', this._translateListener)
    },

    beforeDestroy () {
        if (this._translateListener) {
            window.removeEventListener('cheat-translate-finish', this._translateListener)
        }
    },

    computed: {
        filteredTableItems () {
            return this.tableItems.filter(item => {
                if (this.excludeNameless && !item.name) {
                    return false
                }

                return true
            })
        }
    },

    methods: {
        async initializeVariables () {
            try {
                console.log('Initializing variables...')

                if (typeof $dataSystem === 'undefined' || !$dataSystem || !$gameVariables) {
                    console.warn('Game data not ready yet, skipping variable initialization')
                    return
                }

                this.originalVariableNames = $dataSystem.variables.slice()

                if (!this.originalVariableNames || this.originalVariableNames.length === 0) {
                    console.warn('No variables found in game data')
                    this.tableItems = []
                    return
                }
                
                const translateEnabled = TRANSLATE_SETTINGS.isVariableTranslateEnabled()

                this.tableItems = this.originalVariableNames.map((varName, idx) => {
                    let displayName = varName || `Variable ${idx}`
                    let val = 0
                    try {
                        val = $gameVariables.value(idx)
                    } catch (e) {
                        console.warn(`Could not read variable ${idx}:`, e.message)
                    }
                    
                    if (translateEnabled && varName && varName.trim()) {
                        const cached = TRANSLATION_BANK.get(varName)
                        if (cached) {
                            displayName = cached.translated
                        }
                    }

                    return {
                        id: idx,
                        originalName: varName || `Variable ${idx}`,
                        displayName: displayName,
                        value: val
                    }
                }).filter(item => item.id > 0) // Skip index 0 which is usually null

                console.log(`Loaded ${this.tableItems.length} variables.`)
                this.isInitialized = true
            } catch (error) {
                console.error('Error initializing variables:', error)
                this.tableItems = []
            }
        },

        onItemChange (item) {
            // modify value
            $gameVariables.setValue(item.id, item.value)

            // refresh
            item.value = $gameVariables.value(item.id)
        },

        async manualRefresh () {
            console.log('🔄 Manual refresh triggered - reloading variables and translations')
            this.isInitialized = false
            this.tableItems = []
            await this.initializeVariables()
            console.log('✅ Manual refresh completed')
        },

        tableItemFilter (value, search, item) {
            if (search === null || search.trim() === '') {
                return true
            }

            search = search.toLowerCase()

            return item.name.toLowerCase().contains(search) || String(item.value).toLowerCase().contains(search)
        }
    }
}
