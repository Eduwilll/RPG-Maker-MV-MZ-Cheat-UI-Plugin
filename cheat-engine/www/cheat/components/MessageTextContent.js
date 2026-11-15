import GameAsset from "./GameAsset.js";
export default {
  name: "MessageTextContent",
  components: { GameAsset },
  props: { text: String },
  computed: {
    parts() {
      const value = String(this.text || ""),
        parts = [];
      const pattern = /\[icon (\d+)\]/g;
      let last = 0,
        match;
      while ((match = pattern.exec(value))) {
        if (match.index > last)
          parts.push({ text: value.slice(last, match.index) });
        parts.push({ icon: Number(match[1]) });
        last = pattern.lastIndex;
      }
      if (last < value.length) parts.push({ text: value.slice(last) });
      return parts;
    },
  },
  template: `<span style="white-space:pre-wrap;overflow-wrap:break-word;"><template v-for="(part,i) in parts"><game-asset v-if="part.icon !== undefined" :key="i" :descriptor="{type:'icon',index:part.icon}" :size="22" :navigate="false"/><span v-else :key="i">{{part.text}}</span></template></span>`,
};
