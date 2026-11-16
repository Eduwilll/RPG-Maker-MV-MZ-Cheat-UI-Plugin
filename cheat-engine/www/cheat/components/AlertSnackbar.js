import { Alert } from "../js/AlertHelper.js";

export default {
  name: "AlertSnackbar",

  template: `
<v-snackbar
    app
    top
    left
    v-model="showSnackbar"
    :timeout="timeout"
    :class="['z-index-cheat-1', 'cheat-snackbar', 'cheat-snackbar--' + level]">
    <span 
        v-for="(line, idx) in text"
        :key="idx"
        class="font-weight-bold caption d-block">
        {{ line }}
    </span>
    <template v-slot:action="{ attrs }">
    <v-btn
        x-small
        class="cheat-snackbar__close"
        icon
        v-bind="attrs"
        @click="showSnackbar = false">
        <v-icon small>mdi-close</v-icon>
    </v-btn>
    </template>
</v-snackbar>
    `,

  data() {
    return {
      showSnackbar: false,
      text: "",
      timeout: 1000,
      level: "info",
    };
  },

  mounted() {
    Alert.alertInternal = (level, msg, err = null, timeout = 1500) => {
      let tone = "info";
      switch (level) {
        case "success":
          tone = "success";
          break;
        case "info":
          tone = "info";
          break;
        case "warn":
          tone = "warning";
          break;
        case "error":
          tone = "error";
          break;
        default:
          tone = "info";
      }

      this.show({
        text: msg,
        level: tone,
        timeout: timeout,
      });
    };
  },

  created() {},

  methods: {
    show(options) {
      this.showSnackbar = false;

      this.text = options.text.split("\n");
      this.timeout = options.timeout;
      if (options.level) {
        this.level = options.level;
      }

      this.showSnackbar = true;
    },
  },
};
