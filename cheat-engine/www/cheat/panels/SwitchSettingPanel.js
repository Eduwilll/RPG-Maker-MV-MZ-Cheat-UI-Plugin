import { ConfirmDialog } from '../js/DialogHelper.js'
import { TRANSLATOR, TRANSLATE_SETTINGS, TRANSLATION_BANK } from '../js/TranslateHelper.js'

export default {
    name: 'SwitchSettingPanel',

    template: `
<v-card flat class="ma-0 pa-0">
    <v-data-table
        v-if="tableHeaders"
        denses
        :headers="tableHeaders"
        :items="filteredTableItems"
        :search="search"
        :custom-filter="tableItemFilter"
        :items-per-page="10">
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
            <div class="d-flex px-3 pt-3 pb-3">
                <v-checkbox
                    v-model="excludeNameless"
                    dense
                    hide-details
                    label="Hide Nameless Items">
                </v-checkbox>
                <v-spacer></v-spacer>
                <v-tooltip
                    bottom>
                    <span>{{ allSwitchOn ? 'Turn off all filtered switches' : 'Turn on all filtered switches' }}</span>
                    <template v-slot:activator="{ on, attrs }">
                        <v-btn
                            color="teal"
                            v-bind="attrs"
                            v-on="on"
                            fab
                            x-small
                            @click="toggleAllSwitches">
                            <v-icon v-text="allSwitchIcon"></v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
            </div>
        </template>
        <template
            v-slot:item.value="{ item }">
            <v-switch
                v-model="item.value"
                dense
                hide-details
                @click.self.stop
                @change="onItemChange(item)">
            </v-switch>
        </template>
    </v-data-table>
    
    <v-tooltip
        bottom>
        <span>Reload switches and translations</span>
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

    data() {
        return {
            search: '',
            excludeNameless: false,

            switchNames: [],

            tableHeaders: [
                {
                    text: 'Name',
                    value: 'name'
                },
                {
                    text: 'Value',
                    value: 'value'
                }
            ],
            tableItems: []
        }
    },

    created() {
        this.initializeVariables()

        this._translateListener = () => {
            if (TRANSLATE_SETTINGS.isSwitchTranslateEnabled()) {
                this.manualRefresh()
            }
        }
        window.addEventListener('cheat-translate-finish', this._translateListener)
    },

    beforeDestroy() {
        if (this._translateListener) {
            window.removeEventListener('cheat-translate-finish', this._translateListener)
        }
    },

    computed: {
        filteredTableItems() {
            return this.tableItems.filter(item => {
                if (item.id === 0 || (this.excludeNameless && !item.name) || (!this.tableItemFilter(item.name, this.search, item))) {
                    return false
                }

                return true
            })
        },

        allSwitchOn() {
            const hasTurnOff = this.filteredTableItems.find((item) => item.value === false)
            return !!!hasTurnOff
        },

        allSwitchIcon() {
            return this.allSwitchOn ? 'mdi-toggle-switch-off' : 'mdi-toggle-switch'
        }
    },

    methods: {
        async initializeVariables() {
            if (typeof $dataSystem === 'undefined' || !$dataSystem || !$gameSwitches) {
                console.warn('Game data not ready yet, skipping switch initialization')
                return
            }

            this.switchNames = this.getSwitchNames()

            this.tableItems = this.switchNames.map((switchName, idx) => {
                let val = false
                try {
                    val = $gameSwitches.value(idx)
                } catch (e) {
                    console.warn(`Could not read switch ${idx}:`, e.message)
                }
                return {
                    id: idx,
                    name: switchName,
                    value: val
                }
            })
        },

        getSwitchNames() {
            const rawSwitchNames = $dataSystem.switches.slice()
            const translateEnabled = TRANSLATE_SETTINGS.isSwitchTranslateEnabled()

            return rawSwitchNames.map((name, idx) => {
                if (translateEnabled && name && name.trim()) {
                    const cached = TRANSLATION_BANK.get(name)
                    if (cached) {
                        return cached.translated
                    }
                }
                return name || `Switch ${idx}`
            })
        },

        async manualRefresh() {
            console.log('🔄 Manual refresh triggered - reloading switches and translations')
            this.switchNames = []
            this.tableItems = []
            await this.initializeVariables()
            console.log('✅ Switch refresh completed')
        },

        onItemChange(item) {
            // modify value
            $gameSwitches.setValue(item.id, item.value)

            // refresh
            item.value = $gameSwitches.value(item.id)
        },

        tableItemFilter(value, search, item) {
            if (search === null || search.trim() === '') {
                return true
            }

            return item.name.toLowerCase().contains(search.toLowerCase())
        },

        toggleAllSwitches() {
            const self = this
            ConfirmDialog.show({
                width: 450,
                message: (this.allSwitchOn ? 'Turn off all filtered switches?' : 'Turn on all filtered switches?') + '\n(CAUTION: Potential to give fatal errors to save data)',
                actions: [{
                    icon: 'mdi-close',
                    label: 'cancel',
                    color: 'white',
                    action: ConfirmDialog.close
                }, {
                    icon: this.allSwitchIcon,
                    color: 'green',
                    label: this.allSwitchOn ? 'Turn Off' : 'Turn On',
                    async action() {
                        const value = !self.allSwitchOn
                        self.filteredTableItems.forEach(item => {
                            $gameSwitches.setValue(item.id, value)
                        })
                        self.initializeVariables()
                        ConfirmDialog.close()
                    }
                }]
            })
        }
    }
}
