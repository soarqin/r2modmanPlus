<template>
    <div id="gameRunningModal" :class="['modal', {'is-active': isOpen}]">
        <div class="modal-background" @click="close"></div>
        <div class="modal-content">
            <div class='notification is-info'>
                <h3 class="title" v-if="isSteamGame">正在通过Steam启动{{ activeGame.displayName }}</h3>
                <h3 class="title" v-else>正在启动{{ activeGame.displayName }}</h3>
                <h5 class="title is-5">关闭本消息继续其他操作。</h5>
                <div v-if="isSteamGame">
                    <p>如果游戏没有立即启动，可能是正在启动Steam和加载游戏。</p>
                    <p>请耐心等待，祝您游戏愉快！</p>
                </div>
            </div>
        </div>
        <button class="modal-close is-large" aria-label="close" @click="close"></button>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import Game from "../../model/game/Game";
import { StorePlatform } from "../../model/game/StorePlatform";

@Component
export default class GameRunningModal extends Vue {
    @Prop({required: true})
    readonly activeGame!: Game;

    isSteamGame = this.activeGame.activePlatform.storePlatform === StorePlatform.STEAM;

    close() {
        this.$store.commit('closeGameRunningModal');
    }

    get isOpen(): boolean {
        return this.$store.state.modals.isGameRunningModalOpen;
    }
}
</script>
