<script lang='ts'>
import Vue from 'vue';
import Component from 'vue-class-component';

import ApiResponse from '../../model/api/ApiResponse';
import GameManager from '../../model/game/GameManager';
import RequestItem from '../../model/requests/RequestItem';
import ConnectionProvider from '../../providers/generic/connection/ConnectionProvider';
import ThunderstorePackages from '../../r2mm/data/ThunderstorePackages';
import ApiCacheUtils from '../../utils/ApiCacheUtils';

@Component
export default class SplashMixin extends Vue {
    activeGame = GameManager.activeGame;
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

    // Get the list of game-specific packages to exclude.
    async getExclusions() {
        this.loadingText = '正在连接到GitHub仓库';

        const showProgress = (progress: number) => {
            this.loadingText = '正在下载排除列表';
            this.getRequestItem('ExclusionsList').setProgress(progress);
        };

        ThunderstorePackages.EXCLUSIONS = await ConnectionProvider.instance.getExclusions(showProgress);
    }

    // Get the list of Thunderstore mods from API.
    async getThunderstoreMods() {
        this.loadingText = '正在连接到Thunderstore';
        let response: ApiResponse|undefined = undefined;

        const showProgress = (progress: number) => {
            this.loadingText = '正在从Thunderstore获取mod列表';
            this.getRequestItem('ThunderstoreDownload').setProgress(progress);
        };

        try {
            response = await ConnectionProvider.instance.getPackages(this.activeGame, showProgress, 3);
        } catch (e) {
            this.isOffline = true;
            this.heroTitle = '无法从Thunderstore获取mod列表';
            this.loadingText = '可能网络故障或者Thunderstore离线。正在检查缓存。';
        }

        if (response) {
            ApiCacheUtils.storeLastRequest(response.data);
        } else {
            const cachedResponse = await ApiCacheUtils.getLastRequest();
            response = cachedResponse ? { data: cachedResponse.payload } : undefined;
        }

        if (response) {
            ThunderstorePackages.handlePackageApiResponse(response);
            await this.$store.dispatch('updateThunderstoreModList', ThunderstorePackages.PACKAGES);
            await this.moveToNextScreen();
        } else {
            this.heroTitle = '无法从Thudnerstore和缓存获取mod列表';
            this.loadingText = '可能网络故障或者Thunderstore离线。不过你仍然可以离线管理mod。';
        }
    }

    async continueOffline() {
        ThunderstorePackages.PACKAGES = [];
        await this.moveToNextScreen();
    }

    async moveToNextScreen() {
        this.$router.push({name: 'profiles'});
    }
}
</script>
