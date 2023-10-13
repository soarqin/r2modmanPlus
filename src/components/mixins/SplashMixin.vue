<script lang='ts'>
import Vue from 'vue';
import Component from 'vue-class-component';

import ApiResponse from '../../model/api/ApiResponse';
import R2Error from '../../model/errors/R2Error';
import RequestItem from '../../model/requests/RequestItem';
import ConnectionProvider from '../../providers/generic/connection/ConnectionProvider';

@Component
export default class SplashMixin extends Vue {
    heroTitle = '';
    heroType: string = 'is-info';
    isOffline = false;
    loadingText = '';
    requests: RequestItem[] = [];

    // Provide access to a request item, as item is not stored in a map.
    getRequestItem(name: string) {
        const item = this.requests.find((ri) => ri.getName() === name);

        if (item === undefined) {
            throw new Error(`无效的请求项目"${name}"`);
        }

        return item;
    }

    // Used to produce a single, combined, RequestItem.
    reduceRequests() {
        return this.requests.reduce((x, y) => x.merge(y));
    }

    resetRequestProgresses() {
        this.requests.forEach((request) => request.setProgress(0));
    }

    // Get the list of game-specific packages to exclude.
    async getExclusions() {
        this.loadingText = '正在连接到GitHub仓库';

        const showProgress = (progress: number) => {
            this.loadingText = '正在下载排除列表';
            this.getRequestItem('ExclusionsList').setProgress(progress);
        };

        await this.$store.dispatch('tsMods/updateExclusions', showProgress);

        this.getRequestItem('ExclusionsList').setProgress(100);
    }

    // Get the list of Thunderstore mods from API or local cache.
    async getThunderstoreMods() {
        this.loadingText = '正在连接到Thunderstore';
        let response: ApiResponse|undefined = undefined;

        const showProgress = (progress: number) => {
            this.loadingText = '正在从Thunderstore获取mod列表';
            this.getRequestItem('ThunderstoreDownload').setProgress(progress);
        };

        try {
            response = await ConnectionProvider.instance.getPackages(this.$store.state.activeGame, showProgress, 3);
        } catch (e) {
            console.error('SplashMixin无法从API获取mod列表。', e);
        } finally {
            this.getRequestItem('ThunderstoreDownload').setProgress(100);
        }

        if (response) {
            this.loadingText = '正在将mod列表保存到本体缓存';

            try {
                await this.$store.dispatch('tsMods/updatePersistentCache', response.data);
            } catch (e) {
                console.error('SplashMixin无法本地缓存mod列表。', e);
            }

            this.loadingText = '正在处理mod列表';
        } else {
            this.loadingText = '正在从缓存处理mod列表';
        }

        this.getRequestItem('CacheOperations').setProgress(50);
        let isModListLoaded = false;

        try {
            await this.$store.dispatch('tsMods/updateMods');
            isModListLoaded = true;
        } catch (e) {
            this.$store.commit(
                'error/handleError',
                R2Error.fromThrownValue(e, `${this.loadingText} failed`)
            );
        } finally {
            this.getRequestItem('CacheOperations').setProgress(100);
        }

        // To proceed, the loading of the mod list should result in a non-empty list.
        // Empty list is allowed if that's actually what the API returned.
        if (
            isModListLoaded &&
            (this.$store.state.tsMods.mods.length || (response && !response.data.length))
        ) {
            await this.moveToNextScreen();
        } else {
            this.heroTitle = '无法获取在线mod列表';
            this.loadingText = '你仍然可以离线使用管理器，但部分功能可能失效。';
            this.isOffline = true;
        }
    }

    async continueOffline() {
        await this.moveToNextScreen();
    }

    async moveToNextScreen() {
        this.$router.push({name: 'profiles'});
    }
}
</script>
