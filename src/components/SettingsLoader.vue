<template>
    <div id="settings-loader">
        <slot v-if="phase === PHASES.LOADED" />

        <div v-if="phase > PHASES.ERROR_STATES" class="modal z-top is-active">
            <div class="modal-content">
                <div class="notification is-danger">
                    <h3 class="title">Error</h3>
                    <h5 class="title is-5">{{error && error.name}}</h5>
                    <p>{{error && error.message}}</p>
                    <br />
                    <h5 class="title is-5">建议</h5>

                    <p v-if="phase === PHASES.GAME_FAILED">
                        这是mod管理器自身的问题。
                        如果管理器有新版本请更新版本。
                    </p>

                    <div v-else-if="phase === PHASES.SETTINGS_FAILED">
                        <p>
                            无法加载本地用户设置。你可以点击下面的按钮重置设置，但注意这样所有游戏的所有设置都会被还原。
                        </p>
                        <br />
                        <button @click="resetSettings" class="button is-white">
                            重置设置
                        </button>
                    </div>

                    <p v-else-if="phase === PHASES.RESET_FAILED">
                        无法重置设置。你可以常识按照此
                        <a @click="openLink('https://github.com/ebkr/r2modmanPlus/wiki/Error:-White-or-blank-game-select-screen-on-startup#corrupted-settings-on-update')">
                            说明
                        </a>进行手动重置。
                    </p>

                    <p v-else-if="phase === PHASES.RETRY_FAILED">
                        本地存储的设置已被还原，但依然没有解决无法加载设置的问题。
                        如果管理器有新版本请更新版本。
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";

import R2Error from "../model/errors/R2Error";
import Game from "..//model/game/Game";
import GameManager from "../model/game/GameManager";
import ManagerSettings from "../r2mm/manager/ManagerSettings";
import { SETTINGS_DB_NAME } from "../r2mm/manager/SettingsDexieStore";

enum PHASES {
    INITIAL = 0,
    LOADED = 1,
    // Only error states beyond this point.
    ERROR_STATES = 100,
    GAME_FAILED = 101,
    SETTINGS_FAILED = 102,
    RESET_FAILED = 103,
    RETRY_FAILED = 104
}

@Component
export default class SettingsLoader extends Vue {
    @Prop({required: true})
    private logError!: (error: R2Error) => void;

    @Prop({required: true})
    openLink!: (url: string) => void;

    error: R2Error|null = null;
    PHASES = PHASES;
    phase = PHASES.INITIAL;

    handleError(name: string, message: string) {
        this.error = new R2Error(name, message);
        this.logError(this.error);
    }

    async loadSettings(game: Game) {
        const isRetry = this.phase === PHASES.SETTINGS_FAILED;
        let settings;
        let error;

        try {
            settings = await ManagerSettings.getSingleton(game);
        } catch (e) {
            this.handleError("无法加载管理器设置", `${e}`);
            this.phase = isRetry ? PHASES.RETRY_FAILED : PHASES.SETTINGS_FAILED;
            return;
        }

        try {
            // Force reload settings from Dexie just to be sure although
            // .getSingleton() should have done it already.
            error = await settings.load(true);
        } catch (e) {
            this.handleError("无法加载管理器设置", `${e}`);
            this.phase = isRetry ? PHASES.RETRY_FAILED : PHASES.SETTINGS_FAILED;
            return;
        }

        if (error) {
            this.handleError(error.name, error.message);
            this.phase = isRetry ? PHASES.RETRY_FAILED : PHASES.SETTINGS_FAILED;
            return;
        }

        this.phase = PHASES.LOADED;
    }

    async resetSettings() {
        try {
            await this.resetIndexedDB();
        } catch (e) {
            this.handleError("无法重置索引数据库", `${e}`);
            this.phase = PHASES.RESET_FAILED;
            return;
        }

        try {
            // Discard settings singleton since it might be in invalid
            // state after the earlier failed loading attempt.
            ManagerSettings.discardSingleton();

            // We know by now that getDefaultGame is safe to use.
            await this.loadSettings(getDefaultGame());
        } catch (e) {
            this.handleError("意外的管理器设置错误", `${e}`);
            this.phase = PHASES.RETRY_FAILED;
        }
    }

    resetIndexedDB() {
        const DBDeleteRequest = window.indexedDB.deleteDatabase(SETTINGS_DB_NAME);

        return new Promise<void>((resolve, reject) => {
            DBDeleteRequest.onsuccess = () => resolve();
            DBDeleteRequest.onerror = () => reject("无法删除设置数据库");
        });
    }

    async created() {
        let defaultGame;

        try {
            defaultGame = getDefaultGame();
        } catch (e) {
            this.handleError("无法读取游戏定义文件", `${e}`);
            this.phase = PHASES.GAME_FAILED;
            return;
        }

        try {
            await this.loadSettings(defaultGame);
        } catch (e) {
            this.handleError("意外的管理器设置错误", `${e}`);
            this.phase = PHASES.SETTINGS_FAILED;
        }
    }
}

const getDefaultGame = () => {
    // Don't trust the non-null asserted typing of GameManager.defaultGame.
    if (GameManager.defaultGame === undefined) {
        throw new Error("GameManager.unsetGame() 返回了未定义值");
    }

    return GameManager.defaultGame;
};

</script>
