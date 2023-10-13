<template>
    <div>
        <hero :title=heroTitle :subtitle='loadingText' :heroType=heroType />
        <div class='notification is-warning'>
            <p>游戏更新可能导致mod失效，因此游戏更新请耐心等待mod作者更新mod。</p>
        </div>
        <progress-bar
            v-if="!isOffline"
            :max='requests.length * 100'
            :value='reduceRequests().getProgress() > 0 ? reduceRequests().getProgress() : undefined'
            :className='[reduceRequests().getProgress() > 0 ? "is-info" : ""]' />
        <div class='columns'>
            <div class='column is-one-quarter'>
                <aside class='menu'>
                    <p class='menu-label'>Help</p>
                    <ul class='menu-list'>
                        <li><a @click="view = 'about'" :class="[view === 'about' ? 'is-active' : '']">关于</a></li>
                        <li><a @click="view = 'faq'" :class="[view === 'faq' ? 'is-active' : '']">常见问题</a></li>
                        <li>
                            <link-component :url="'https://github.com/ebkr/r2modmanPlus'" :target="'external'">
                                <i class='fab fa-github fa-lg' aria-hidden='true' />
                            </link-component>
                        </li>
                    </ul>
                </aside>
            </div>
            <div class='column is-three-quarters'>
                <div class='container'>
                    <br />
                    <nav class='level' v-if='isOffline'>
                        <div class='level-item'>
                            <a class='button is-info margin-right margin-right--half-width' @click='continueOffline()'>离线使用</a>
                            <a class='button' @click='retryConnection()'>尝试重连</a>
                        </div>
                        <br /><br />
                    </nav>
                </div>
                <div>
                    <article class='media'>
                        <div class='media-content'>
                            <div class='content'>
                                <div class='container' v-if="view !== 'main'">
                                    <i class='fas fa-long-arrow-alt-left margin-right' />
                                    <strong><a @click="view = 'main'">Go back</a></strong>
                                    <br /><br />
                                </div>
                                <div class='container' v-if="view === 'main'">
                                    <p>
                    <span class='icon margin-right margin-right--half-width'>
                      <i class='fas fa-info-circle' />
                    </span>
                                        <strong>你知道吗？</strong>
                                    </p>
                                    <ul class='margin-right'>
                                        <li>
                                            <p>
                                                在
                                                <link-component
                                                    :url="'https://thunderstore.io'" :target="'external'">Thunderstore
                                                </link-component>
                                                上你可以点击"Install with Mod Manager"调用r2modman安装mod。
                                            </p>
                                        </li>
                                        <li>
                                            <p>
                                                你可以在设置界面将用户配置导出为文件或代码，以方便分享给他人！
                                            </p>
                                        </li>
                                    </ul>
                                    <p>
                    <span class='icon margin-right margin-right--half-width'>
                      <i class='fas fa-question-circle' />
                    </span>
                                        <strong>遇到问题了？</strong>
                                    </p>
                                    <p>
                                        发送错误截图到Thunderstore modding discord。
                                        如果问题没有得到解决欢迎找我。
                                    </p>
                                </div>
                                <div class='container' v-else-if="view === 'about'">
                                    <p>
                    <span class='icon margin-right margin-right--half-width'>
                      <i class='fas fa-address-card' />
                    </span>
                                        <strong>关于r2modman</strong>
                                    </p>
                                    <p>它是Ebkr用Quasar写的。</p>
                                    <p>Quasar为r2modman的开发提供了以下开发工具/环境:</p>
                                    <ul>
                                        <li>Electron</li>
                                        <li>Node</li>
                                        <li>Vue</li>
                                        <li>TypeScript</li>
                                    </ul>
                                </div>
                                <div class='container' v-else-if="view === 'faq'">
                                    <p>
                    <span class='icon margin-right margin-right--half-width'>
                      <i class='fas fa-question-circle' />
                    </span>
                                        <strong>常见问题</strong>
                                    </p>
                                    <ul>
                                        <li>
                                            <p><strong>怎么上手？</strong></p>
                                            <p>
                                                去在线Mod列表页签，下载BepInEx以及对应游戏的mod。
                                            </p>
                                        </li>
                                        <li>
                                            <p><strong>启动游戏时加载mod</strong></p>
                                            <p>
                                                从管理器左上角点击按钮开始游戏才能加载mod，从Steam启动并不会。
                                            </p>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang='ts'>
import * as path from 'path';

import { ipcRenderer } from 'electron';
import Component, { mixins } from 'vue-class-component';

import { Hero, Link, Progress } from '../components/all';
import SplashMixin from '../components/mixins/SplashMixin.vue';
import Game from '../model/game/Game';
import RequestItem from '../model/requests/RequestItem';
import FsProvider from '../providers/generic/file/FsProvider';
import GameDirectoryResolverProvider from '../providers/ror2/game/GameDirectoryResolverProvider';
import LinuxGameDirectoryResolver from '../r2mm/manager/linux/GameDirectoryResolver';
import PathResolver from '../r2mm/manager/PathResolver';

@Component({
    components: {
        'hero': Hero,
        'progress-bar': Progress,
        'link-component': Link
    }
})
export default class Splash extends mixins(SplashMixin) {
    heroTitle: string = 'Starting r2modman';
    loadingText: string = 'Initialising';
    view: string = 'main';

    requests = [
        new RequestItem('UpdateCheck', 0),
        new RequestItem('ThunderstoreDownload', 0),
        new RequestItem('ExclusionsList', 0),
        new RequestItem('CacheOperations', 0)
    ];

    // Ensure that r2modman isn't outdated.
    private checkForUpdates() {
        this.loadingText = 'Preparing';
        ipcRenderer.once('update-done', async () => {
            this.getRequestItem('UpdateCheck').setProgress(100);
            await this.getExclusions();
            await this.getThunderstoreMods();
        });
        ipcRenderer.send('update-app');
    }

    async moveToNextScreen() {
        if (process.platform === 'linux') {
            const activeGame: Game = this.$store.state.activeGame;

            if (!await (GameDirectoryResolverProvider.instance as LinuxGameDirectoryResolver).isProtonGame(activeGame)) {
                console.log('Not proton game');
                await this.ensureWrapperInGameFolder();
                const launchArgs = await (GameDirectoryResolverProvider.instance as LinuxGameDirectoryResolver).getLaunchArgs(activeGame);
                console.log(`Launch arguments for this game:`, launchArgs);
                if (typeof launchArgs === 'string' && !launchArgs.startsWith(path.join(PathResolver.MOD_ROOT, 'linux_wrapper.sh'))) {
                    this.$router.push({name: 'linux'});
                    return;
                }
            }
        } else if (process.platform === 'darwin') {
            await this.ensureWrapperInGameFolder();
            this.$router.push({name: 'linux'});
            return;
        }
        this.$router.push({name: 'profiles'});
    }

    retryConnection() {
        this.resetRequestProgresses();
        this.isOffline = false;
        this.checkForUpdates();
    }

    private async ensureWrapperInGameFolder() {
        const wrapperName = process.platform === 'darwin' ? 'macos_proxy' : 'linux_wrapper.sh';
        const activeGame: Game = this.$store.state.activeGame;
        console.log(`Ensuring wrapper for current game ${activeGame.displayName} in ${path.join(PathResolver.MOD_ROOT, wrapperName)}`);
        try {
            await FsProvider.instance.stat(path.join(PathResolver.MOD_ROOT, wrapperName));
            const oldBuf = (await FsProvider.instance.readFile(path.join(PathResolver.MOD_ROOT, wrapperName)));
            const newBuf = (await FsProvider.instance.readFile(path.join(__statics, wrapperName)));
            if (!oldBuf.equals(newBuf)) {
                throw new Error('过时的缓冲区');
            }
        } catch (_) {
            if (await FsProvider.instance.exists(path.join(PathResolver.MOD_ROOT, wrapperName))) {
                await FsProvider.instance.unlink(path.join(PathResolver.MOD_ROOT, wrapperName));
            }
            await FsProvider.instance.copyFile(path.join(__statics, wrapperName), path.join(PathResolver.MOD_ROOT, wrapperName));
        }
        await FsProvider.instance.chmod(path.join(PathResolver.MOD_ROOT, wrapperName), 0o755);
    }

    async created() {
        this.loadingText = '正在检查更新';
        setTimeout(this.checkForUpdates, 100);
    }
}
</script>
