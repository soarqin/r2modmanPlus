<template>
    <div>
        <Hero title="帮助" subtitle="常见问题以及可能的解决方案" hero-type="is-info"/>
        <div
            class="tabs sticky-top sticky-top--opaque sticky-top--no-shadow sticky-top--no-padding has-background-">
            <ul>
                <li v-for="(key, index) in tabs" :key="`tab-${key}`"
                    :class="[{'is-active': activeTab === key}]"
                    @click="changeTab(key)">
                    <a>{{tabToText(key)}}</a>
                </li>
            </ul>
        </div>
        <div class="container margin-right">
            <br/>
            <div ref="General" v-if="activeTab === 'General'">
                <h2 class="title is-5">上手开始安装mod</h2>
                <p>
                    去"在线Mod列表"页签，找到想下载的mod并点击下载按钮。
                    所有依赖也会被同时下载。
                </p>
                <p>下载了需要的mod后，点击左上角的<strong>启用Mod开始游戏</strong>。</p>
                <hr/>
                <h2 class='title is-5'>加载mod后游戏拖慢/卡顿？</h2>
                <p>
                    很可能是mod抛出了异常。
                    可以通过每次禁用一半mod的方法启动游戏看问题是否依然存在来排查到底是哪个mod出了问题。
                    <br/><br/>
                    对于卡顿，可能部分游戏有特定的优化mod来解决。
                </p>
                <hr/>
                <h2 class='title is-5'>专用服务器</h2>
                <p>
                    mod管理器本身不直接支持专用服务器，你需要手动把用户配置目录里的内容复制到你的专用服务器里才能让mod生效。
                </p>
                <hr/>
                <h2 class='title is-5'>从mod管理器外对游戏启用mod支持</h2>
                <p>
                    按照管理的设计，你从Steam启动游戏并不会加载mod。
                    <br/><br/>
                    你需要在游戏的启动参数里添加特定的参数才能在管理器外支持带mod开始游戏。
                    <br/>
                    对于Steam用户，可以在对应游戏的设置里找到添加参数的地方。
                    <br/><br/>
                    当前用户配置对应的参数为:
                    <code v-if="doorstopTarget.length > 0">{{ doorstopTarget }}</code>
                    <code v-else>这些参数在安装BepInEx后才会生效。</code>
                </p>
            </div>
            <div ref="Game won't start" v-if="activeTab === `Game won't start`">
                <h2 class='title is-5'>开始游戏后出现红框</h2>
                <p>按红框底部的建议操作。</p>
                <hr/>
                <h2 class='title is-5'>直接跳转到了Steam商店页面</h2>
                <p>看起来你没有购买游戏的正版拷贝。本管理器只支持正版游戏。</p>
                <hr/>
                <h2 class='title is-5'>弹出了一个文本窗口然后马上就消失了。</h2>
                <p>尝试在设置界面修复preloader。</p>
                <p>如果依然存在问题，强行退出Steam后再点击按钮启动游戏。</p>
            </div>
            <div ref="Mods not appearing" v-if="activeTab === 'Mods not appearing'">
                <h2 class='title is-5'>可能的解决方案</h2>
                <p>最常见的问题都可以通过参考
                    <Link target="external" url="https://github.com/ebkr/r2modmanPlus/wiki/Why-aren't-my-mods-working%3F">
                        这里
                    </Link>的网页解决。
                </p>
            </div>
            <div ref="Updating" v-if="activeTab === 'Updating'">
                <h2 class='title is-5'>自动更新</h2>
                <p>当有更新时，管理器会在关闭时自我更新。</p>
                <p>更新文件会在后台下载。</p>
                <p>在更新过程中你可能会收到请求管理员身份运行<i>old_uninstaller</i>的提示，这是自动更新的正常流程。</p>
                <p>如果更新中出现问题，你可以手动下载安装本管理器。</p>
                <hr/>
                <h2 class='title is-5'>我不想要更新</h2>
                <p>
                    GitHub上有一个不进行自动更新的便携版，但他依然会提示你有可用的更新。
                </p>
            </div>
        </div>
    </div>
</template>

<script lang="ts">

    import { Component, Vue } from 'vue-property-decorator';
    import Profile from '../model/Profile';
    import {Hero, Link} from '../components/all';
    import GameRunnerProvider from '../providers/generic/game/GameRunnerProvider';
    import R2Error from '../model/errors/R2Error';
    import Game from '../model/game/Game';
    import GameManager from '../model/game/GameManager';

    @Component({
        components: {
            Link,
            Hero
        }
    })
    export default class Help extends Vue {
        private activeTab = 'General';
        private tabs = ['General', 'Game won\'t start', 'Mods not appearing', 'Updating'];
        private doorstopTarget = "";
        private activeGame!: Game;

        tabToText(key: string): string {
            switch (key) {
            case 'General': return '常规';
            case 'Game won\'t start': return '游戏无法启动';
            case 'Mods not appearing': return 'Mod无效';
            case 'Updating': return '更新';
            default: return '';
            }
        }
        changeTab(key: string) {
            this.activeTab = key;
        }

        getActiveProfile(): Profile {
            return Profile.getActiveProfile();
        }

        created() {
            this.activeGame = GameManager.activeGame;
        }

        mounted() {
            GameRunnerProvider.instance.getGameArguments(this.activeGame, Profile.getActiveProfile()).then(target => {
                if (target instanceof R2Error) {
                    this.doorstopTarget = "";
                } else {
                    this.doorstopTarget = target;
                }
            });
        }

    }
</script>
