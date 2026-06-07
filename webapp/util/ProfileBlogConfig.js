/**
 * ProfileBlogConfig.js
 *
 * 프로필 이름별 블로그 URL·QR 이미지 매핑.
 */
sap.ui.define([], function () {
    "use strict";

    var DEFAULT_BLOG = {
        url: "https://blog.naver.com/channy0210",
        qrSrc: "images/profile-blog-qr.png"
    };

    var BLOG_BY_NAME = {
        "김용민": {
            url: "https://blog.naver.com/dydals3355",
            qrSrc: "images/profile-blog-qr-dydals3355.png"
        },
        "박찬영": DEFAULT_BLOG,
        "신성진": DEFAULT_BLOG
    };

    return {
        getBlogByName: function (sName) {
            return BLOG_BY_NAME[sName] || DEFAULT_BLOG;
        }
    };
});
