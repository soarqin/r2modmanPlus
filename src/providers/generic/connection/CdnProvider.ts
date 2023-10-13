import R2Error from '../../../model/errors/R2Error';
import { getAxiosWithTimeouts } from '../../../utils/HttpUtils';
import { addOrReplaceSearchParams, replaceHost } from '../../../utils/UrlUtils';

const CDNS = [
    "gcdn.thunderstore.io",
    "hcdn-1.hcdn.thunderstore.io"
]
const TEST_FILE = "healthz";

const CONNECTION_ERROR = new R2Error(
    "无法访问CDN网络",
    `所有Thunderstore CDN网络都无法被访问。你依然可以使用mod管理器，但下载mod功能将无法正常工作。`,
    `请尝试切换互联网连接以解决此问题。`
);

export default class CdnProvider {
    private static axios = getAxiosWithTimeouts(5000, 5000);
    private static preferredCdn = "";

    public static get current() {
        const i = CDNS.findIndex((cdn) => cdn === CdnProvider.preferredCdn);
        return {
            label: [-1, 0].includes(i) ? "主CDN" : `镜像#${i}`,
            url: CdnProvider.preferredCdn
        };
    }

    public static async checkCdnConnection() {
        const headers = {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Expires": "0",
        };
        const params = {"disableCache": new Date().getTime()};
        let res;

        for await (const cdn of CDNS) {
            const url = `https://${cdn}/${TEST_FILE}`;

            try {
                res = await CdnProvider.axios.get(url, {headers, params});
            } catch (e) {
                continue;
            }

            if (res.status === 200) {
                CdnProvider.preferredCdn = cdn;
                return;
            }
        };

        throw CONNECTION_ERROR;
    }

    public static replaceCdnHost(url: string) {
        return CdnProvider.preferredCdn
            ? replaceHost(url, CdnProvider.preferredCdn)
            : url;
    }

    public static addCdnQueryParameter(url: string) {
        return CdnProvider.preferredCdn
            ? addOrReplaceSearchParams(url, `cdn=${CdnProvider.preferredCdn}`)
            : url;
    }

    public static togglePreferredCdn() {
        let currentIndex = CDNS.findIndex((cdn) => cdn === CdnProvider.preferredCdn);

        if (currentIndex === -1) {
            currentIndex = 0;
        }

        CdnProvider.preferredCdn = CDNS[currentIndex + 1] || CDNS[0];
    }
}
