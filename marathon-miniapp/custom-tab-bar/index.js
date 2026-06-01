Component({
  data: {
    selected: -1,
    list: [
      {
        pagePath: "/pages/home/index",
        text: "首页",
        key: "home",
      },
      {
        pagePath: "/pages/plan/index",
        text: "计划",
        key: "plan",
      },
      {
        pagePath: "/pages/race/index",
        text: "赛事",
        key: "race",
      },
      {
        pagePath: "/pages/profile/index",
        text: "我的",
        key: "profile",
      },
    ],
  },

  lifetimes: {
    attached() {
      this.updateSelectedByRoute();
    },
  },

  pageLifetimes: {
    show() {
      this.updateSelectedByRoute();
    },
  },

  methods: {
    getCurrentRoute() {
      const pages = getCurrentPages();
      const current = pages && pages.length ? pages[pages.length - 1] : null;
      if (!current) {
        return "";
      }
      const rawRoute = current.route || current.__route__ || "";
      if (!rawRoute) {
        return "";
      }
      return rawRoute.startsWith("/") ? rawRoute : `/${rawRoute}`;
    },

    updateSelectedByRoute() {
      const route = this.getCurrentRoute();
      const index = this.data.list.findIndex((item) => item.pagePath === route);
      if (index >= 0 && index !== this.data.selected) {
        this.setData({
          selected: index,
        });
      }
    },

    onTabTap(event) {
      const path = event.currentTarget.dataset.path;
      if (!path) {
        return;
      }
      const index = this.data.list.findIndex((item) => item.pagePath === path);
      if (index >= 0) {
        this.setData({
          selected: index,
        });
      }
      wx.switchTab({
        url: path,
      });
    },
  },
});
