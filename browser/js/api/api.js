app.config(($stateProvider) => {
  $stateProvider.state('api', {
    url: '/:id/apis',
    templateUrl: 'js/api/api.html',
    controller: ($scope, user, routes) => {
      $scope.user = user
      $scope.routes = routes

      // test data
      $scope.data = {
        name: "Hacker News",
        count: 30,
        frequency: "Manual Crawl",
        version: 2,
        newData: true,
        lastRunStatus: "success",
        thisVersionStatus: "success",
        thisVersionRun: "Thu Aug 13 2015 01:30:48 GMT+0000 (UTC)",
        sourceUrl: 'https://news.ycombinator.com/',
        results: {
          Story: [
            {
              title: {
                href: "https://plus.google.com/+Ingress/posts/GVvbYZzWyTT",
                text: "Niantic Labs splitting from Google"
              },
              url: "https://news.ycombinator.com/",
              points: "41",
              user: {
                href: "https://news.ycombinator.com/user?id=martindale",
                text: "martindale"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10051517",
                text: "15"
              },
              index: 1
            },
            {
              title: {
                href: "http://techcrunch.com/2015/08/12/ohm-is-a-smarter-lighter-car-battery-that-works-with-your-existing-car/",
                text: "Ohm (YC S15) is a smarter, lighter car battery that works with your existing car"
              },
              url: "https://news.ycombinator.com/",
              points: "200",
              user: {
                href: "https://news.ycombinator.com/user?id=blueintegral",
                text: "blueintegral"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10049927",
                text: "196"
              },
              index: 2
            },
            {
              title: {
                href: "https://www.kickstarter.com/projects/45588301/woolfe-the-red-hood-diaries/posts/1168409",
                text: "“It’s done, there is no way back. We tried, we failed”"
              },
              url: "https://news.ycombinator.com/",
              points: "519",
              user: {
                href: "https://news.ycombinator.com/user?id=danso",
                text: "danso"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10047721",
                text: "301"
              },
              index: 3
            },
            {
              title: {
                href: "http://parnold-x.github.io/nasc/",
                text: "Show HN: NaSC – Do maths like a normal person"
              },
              url: "https://news.ycombinator.com/",
              points: "45",
              user: {
                href: "https://news.ycombinator.com/user?id=macco",
                text: "macco"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10050949",
                text: "8"
              },
              index: 4
            },
            {
              title: {
                href: "http://arstechnica.com/science/2015/08/octopus-sophistication-driven-by-hundreds-of-previously-unknown-genes/",
                text: "Octopus’ sophistication driven by hundreds of previously unknown genes"
              },
              url: "https://news.ycombinator.com/",
              points: "35",
              user: {
                href: "https://news.ycombinator.com/user?id=Audiophilip",
                text: "Audiophilip"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10050582",
                text: "1"
              },
              index: 5
            },
            {
              title: {
                href: "http://blog.samaltman.com/projects-and-companies",
                text: "Projects and Companies"
              },
              url: "https://news.ycombinator.com/",
              points: "212",
              user: {
                href: "https://news.ycombinator.com/user?id=runesoerensen",
                text: "runesoerensen"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10048557",
                text: "40"
              },
              index: 6
            },
            {
              title: {
                href: "https://www.openlistings.co/near",
                text: "Show HN: Find a home close to work"
              },
              url: "https://news.ycombinator.com/",
              points: "61",
              user: {
                href: "https://news.ycombinator.com/user?id=rgbrgb",
                text: "rgbrgb"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10049631",
                text: "50"
              },
              index: 7
            },
            {
              title: {
                href: "https://www.youtube.com/watch?v=g01dGsKbXOk",
                text: "Netflix – Chasing 60fps [video]"
              },
              url: "https://news.ycombinator.com/",
              points: "46",
              user: {
                href: "https://news.ycombinator.com/user?id=tilt",
                text: "tilt"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10050230",
                text: "26"
              },
              index: 8
            },
            {
              title: {
                href: "http://www.bbc.com/news/magazine-33860778",
                text: "How the UK found Japanese speakers in a hurry in WW2"
              },
              url: "https://news.ycombinator.com/",
              points: "35",
              user: {
                href: "https://news.ycombinator.com/user?id=samaysharma",
                text: "samaysharma"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10050655",
                text: "7"
              },
              index: 9
            },
            {
              title: {
                href: "https://groups.google.com/forum/#!topic/emscripten-discuss/gQQRjajQ6iY",
                text: "Emscripten gains experimental pthreads support"
              },
              url: "https://news.ycombinator.com/",
              points: "6",
              user: {
                href: "https://news.ycombinator.com/user?id=vmorgulis",
                text: "vmorgulis"
              },
              comments: {
                href: "",
                text: ""
              },
              index: 10
            },
            {
              title: {
                href: "http://news.squeak.org/2015/08/12/squeak-5-is-out/",
                text: "Squeak 5 is out"
              },
              url: "https://news.ycombinator.com/",
              points: "142",
              user: {
                href: "https://news.ycombinator.com/user?id=Fice",
                text: "Fice"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10047970",
                text: "26"
              },
              index: 11
            },
            {
              title: {
                href: "https://ocharles.org.uk/blog/posts/2014-02-04-how-i-develop-with-nixos.html",
                text: "How I develop with Nix"
              },
              url: "https://news.ycombinator.com/",
              points: "104",
              user: {
                href: "https://news.ycombinator.com/user?id=ayberkt",
                text: "ayberkt"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10047005",
                text: "35"
              },
              index: 12
            },
            {
              title: {
                href: "https://blog.twitter.com/2015/removing-the-140-character-limit-from-direct-messages",
                text: "Removing the 140-character limit from Direct Messages"
              },
              url: "https://news.ycombinator.com/",
              points: "139",
              user: {
                href: "https://news.ycombinator.com/user?id=uptown",
                text: "uptown"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10049137",
                text: "105"
              },
              index: 13
            },
            {
              title: {
                href: "http://markallenthornton.com/blog/stylistic-similarity/",
                text: "Analyzing stylistic similarity amongst authors"
              },
              url: "https://news.ycombinator.com/",
              points: "19",
              user: {
                href: "https://news.ycombinator.com/user?id=lingben",
                text: "lingben"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10050603",
                text: "5"
              },
              index: 14
            },
            {
              title: {
                href: "http://www.tldp.org/HOWTO/Assembly-HOWTO/hello.html",
                text: "Linux Assembly How To: “Hello, World”"
              },
              url: "https://news.ycombinator.com/",
              points: "82",
              user: {
                href: "https://news.ycombinator.com/user?id=mindcrime",
                text: "mindcrime"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10049020",
                text: "26"
              },
              index: 15
            },
            {
              title: {
                href: "https://apphub.io/",
                text: "AppHub – Update React Native Apps Without Re-Submitting to Apple"
              },
              url: "https://news.ycombinator.com/",
              points: "122",
              user: {
                href: "https://news.ycombinator.com/user?id=arbesfeld",
                text: "arbesfeld"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10048072",
                text: "55"
              },
              index: 16
            },
            {
              title: {
                href: "https://developer.nvidia.com/deep-learning-courses",
                text: "Deep Learning Courses"
              },
              url: "https://news.ycombinator.com/",
              points: "94",
              user: {
                href: "https://news.ycombinator.com/user?id=cjdulberger",
                text: "cjdulberger"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10048487",
                text: "15"
              },
              index: 17
            },
            {
              title: {
                href: "http://lens.blogs.nytimes.com/2015/08/12/kodaks-first-digital-moment/",
                text: "Kodak’s First Digital Moment"
              },
              url: "https://news.ycombinator.com/",
              points: "46",
              user: {
                href: "https://news.ycombinator.com/user?id=tysone",
                text: "tysone"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10048766",
                text: "17"
              },
              index: 18
            },
            {
              title: {
                href: "https://blog.fusiondigital.io/the-internet-of-things-a-look-at-embedded-wifi-development-boards-7abee1311711?source=your-stories",
                text: "A Look at Embedded WiFi Development Boards"
              },
              url: "https://news.ycombinator.com/",
              points: "44",
              user: {
                href: "https://news.ycombinator.com/user?id=hlfshell",
                text: "hlfshell"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10048434",
                text: "16"
              },
              index: 19
            },
            {
              title: {
                href: "https://github.com/szilard/benchm-ml",
                text: "Comparison of machine learning libraries used for classification"
              },
              url: "https://news.ycombinator.com/",
              points: "172",
              user: {
                href: "https://news.ycombinator.com/user?id=pzs",
                text: "pzs"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10047037",
                text: "33"
              },
              index: 20
            },
            {
              title: {
                href: "http://venturebeat.com/2015/08/11/sourcedna-launches-searchlight-a-developer-tool-to-find-coding-problems-in-any-app/",
                text: "SourceDNA (YC S15) finds hidden security and quality flaws in apps"
              },
              url: "https://news.ycombinator.com/",
              points: "49",
              user: {
                href: "https://news.ycombinator.com/user?id=katm",
                text: "katm"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10049925",
                text: "30"
              },
              index: 21
            },
            {
              title: {
                href: "https://github.com/blog/2046-github-desktop-is-now-available",
                text: "GitHub Desktop is now available"
              },
              url: "https://news.ycombinator.com/",
              points: "253",
              user: {
                href: "https://news.ycombinator.com/user?id=bpierre",
                text: "bpierre"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10048100",
                text: "203"
              },
              index: 22
            },
            {
              title: {
                href: "https://www.theguardian.com/info/developer-blog/2015/aug/12/open-sourcing-grid-image-service",
                text: "Open sourcing Grid, the Guardian’s new image management service"
              },
              url: "https://news.ycombinator.com/",
              points: "126",
              user: {
                href: "https://news.ycombinator.com/user?id=room271",
                text: "room271"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10047685",
                text: "17"
              },
              index: 23
            },
            {
              title: {
                href: "http://penguinrandomhouse.ca/hazlitt/feature/last-days-kathy-acker",
                text: "The Last Days of Kathy Acker"
              },
              url: "https://news.ycombinator.com/",
              points: "3",
              user: {
                href: "https://news.ycombinator.com/user?id=colinprince",
                text: "colinprince"
              },
              comments: {
                href: "",
                text: ""
              },
              index: 24
            },
            {
              title: {
                href: "http://axon.cs.byu.edu/mrsmith/2015IJCNN_MANIC.pdf",
                text: "A Minimal Architecture for General Cognition [pdf]"
              },
              url: "https://news.ycombinator.com/",
              points: "53",
              user: {
                href: "https://news.ycombinator.com/user?id=luu",
                text: "luu"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10048017",
                text: "8"
              },
              index: 25
            },
            {
              title: {
                href: "https://blog.docker.com/2015/08/content-trust-docker-1-8/",
                text: "Introducing Docker Content Trust"
              },
              url: "https://news.ycombinator.com/",
              points: "83",
              user: {
                href: "https://news.ycombinator.com/user?id=dkasper",
                text: "dkasper"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10048096",
                text: "24"
              },
              index: 26
            },
            {
              title: {
                href: "http://blog.convox.com/integration-over-invention",
                text: "Integration over Invention"
              },
              url: "https://news.ycombinator.com/",
              points: "87",
              user: {
                href: "https://news.ycombinator.com/user?id=bgentry",
                text: "bgentry"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10048086",
                text: "9"
              },
              index: 27
            },
            {
              title: {
                href: "http://www.economist.com/news/leaders/21660919-only-second-time-our-history-ownership-economist-changes-new-chapter",
                text: "For only the second time in our history the ownership of The Economist changes"
              },
              url: "https://news.ycombinator.com/",
              points: "149",
              user: {
                href: "https://news.ycombinator.com/user?id=ucaetano",
                text: "ucaetano"
              },
              comments: {
                href: "https://news.ycombinator.com/item?id=10047845",
                text: "126"
              },
              index: 28
            },
            {
              title: {
                href: "http://grnh.se/ipfyb3",
                text: "HelloSign (YC W11) Is Hiring a Technical Product Manager for Its API"
              },
              url: "https://news.ycombinator.com/",
              points: "",
              user: {
                href: "",
                text: ""
              },
              comments: {
                href: "",
                text: ""
              },
              index: 29
            },
            {
              title: {
                href: "http://newsoffice.mit.edu/2015/real-time-data-for-cancer-therapy-0804",
                text: "Real-time data for cancer therapy"
              },
              url: "https://news.ycombinator.com/",
              points: "18",
              user: {
                href: "https://news.ycombinator.com/user?id=openmaze",
                text: "openmaze"
              },
              comments: {
                href: "",
                text: ""
              },
              index: 30
            }
          ]
        }
      }
    },
    resolve: {
      user: ($stateParams, User) => User.find($stateParams.id),
      routes: (user) => user.getRoutes()
    }
  })
})
