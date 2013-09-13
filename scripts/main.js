var app = angular.module('main', ['ngResource', 'ngSanitize']);

app.factory('Reddit', ['$resource', function($resource) {
	return $resource(
		'http://www.reddit.com/r/:subreddit/hot.json',
		{subreddit: '@subreddit'},
		{get: {method: 'JSONP', params: {after: '@after', jsonp: 'JSON_CALLBACK'}}}
	);
}]);

app.controller('MainCtrl', ['$scope', '$window', 'Reddit', function($scope, $window, Reddit) {
	$scope.unescape = _.unescape;
	$scope.listings = [];
	$scope.pages = [];

	if (localStorage['subreddits']) {
		$scope.subreddits = JSON.parse(localStorage['subreddits']);
	} else {
		resetDefaultSubreddits();
	}

	$scope.$watch('subreddits', function() {
		localStorage['subreddits'] = JSON.stringify(_.map($scope.subreddits, function(subreddit) {
			return {name: subreddit.name, selected: subreddit.selected, loading: false, loads: 0};
		}));
	}, true);

	var Site = {
		isQuickmeme: function(url) { return (/www\.quickmeme\.com/i).test(url); },
		quickmemeId: function(url) { return url.match(/http:\/\/www\.quickmeme\.com\/meme\/(.+)\//i); },
		isImage: function(url) { return (/\.jpg|\.png|\.gif|\.jpeg/i).test(url); },
		isGif: function(url) { return (/\.gif/i).test(url); },
		isImgur: function(url) { return (/imgur\.com/i).test(url); },
		isImgurAlbum: function(url) { return (/imgur\.com\/a\//i).test(url); },
		isImgurGallery: function(url) { return (/imgur\.com\/gallery\//i).test(url); },
		isImgurBlog: function(url) { return (/imgur\.com\/blog\//i).test(url); },
		isFlickr: function(url) { return (/flickr\.com/i).test(url); }
	};

	function initialiseListing(listing) {
		if (Site.isGif(listing.data.url)) {
			listing.listing_type = 'image-gif';
		} else if (Site.isImage(listing.data.url)) {
			listing.listing_type = 'image';
		} else if (Site.isQuickmeme(listing.data.url)) {
			var quickmemeId = Site.quickmemeId(listing.data.url);
			if (quickmemeId.length > 0) {
				listing.listing_type = 'image';
				listing.data.url = 'http://i.qkme.me/' + quickmemeId[1] + '.jpg';
			}
		} else if (Site.isImgurAlbum(listing.data.url) || Site.isImgurGallery(listing.data.url) || Site.isImgurBlog(listing.data.url)) {
			listing.listing_type = 'image-album';
		} else if (Site.isImgur(listing.data.url) && !(/#\d+/i).test(listing.data.url)) { // TODO links to imgur #1, #2 etc
			listing.listing_type = 'image';
			listing.data.url = listing.data.url + '.png';
		} else if (Site.isFlickr(listing.data.url)) {
			listing.listing_type = 'image-thumbnail';
		} else if (null !== listing.data.media) {
			listing.listing_type = 'media';
		} else if (listing.data.is_self) {
			listing.listing_type = 'post';
		} else {
			listing.listing_type = 'link';
		}

		return listing;
	}

	function resetDefaultSubreddits() {
		$scope.subreddits = [
			{name: 'fixedgearbicycle', selected: false, loading: false, loads: 0},
			{name: 'gaming', selected: false, loading: false, loads: 0},
			{name: 'funny', selected: false, loading: false, loads: 0},
			{name: 'gifs', selected: false, loading: false, loads: 0},
			{name: 'pictures', selected: false, loading: false, loads: 0},
			{name: 'snowboarding', selected: false, loading: false, loads: 0},
			{name: 'cats', selected: false, loading: false, loads: 0},
			{name: 'aww', selected: false, loading: false, loads: 0}
		];
	}

	function search(subreddit) {
		subreddit.loading = true;
		subreddit.loads += 1;
		var query = subreddit.after ? {subreddit: subreddit.name, after: subreddit.after} : {subreddit: subreddit.name};

		Reddit.get(query, function ok(result) {
			_.each(result.data.children, function(listing, index) {
				initialiseListing(listing);
				listing.subreddit = subreddit;
				listing.index = index;
			});

			$scope.pages[subreddit.loads - 1] = $scope.pages[subreddit.loads - 1] || [];
			$scope.pages[subreddit.loads - 1] = $scope.pages[subreddit.loads - 1].concat(result.data.children);
			subreddit.after = result.data.after;
			subreddit.loading = false;
		});
	}

	$scope.loadListings = function() {
		_.chain($scope.subreddits)
			.where({selected: true, loading: false})
			.each(function(subreddit) { search(subreddit); });
	};

	$scope.toggleSubreddit = function(subreddit) {
		$scope.showSubredditsDropdown = false;
		subreddit.selected = !subreddit.selected;
		$scope.loadListings();
	};

	$scope.addSubreddit = function() {
		var name = $scope.newSubredditName.trim();
		var existing = _.findWhere($scope.subreddits, {name: name});

		if (existing) {
			existing.selected = true;
			search(existing);
		} else if (name !== '') {
			var newSubreddit = {name: $scope.newSubredditName, selected: true, loading: false, loads: 0};
			$scope.subreddits.push(newSubreddit);
			search(newSubreddit);
		}

		$scope.newSubredditName = '';
		$scope.addSubredditOpen = false;
	};

	$scope.removeSubreddit = function(subreddit) {
		$scope.subreddits = _.reject($scope.subreddits, function(s) { return subreddit === s; });
		$scope.listings = _.reject($scope.listings, function(listing) { return subreddit == listing.subreddit; });
	};

	$scope.openSubredditForm = function() {
		$scope.addSubredditOpen = true;
		_.defer(function() {
			document.getElementsByClassName('subreddit-name-field')[0].focus();
		});
	};

	$scope.isSelected = function(subredditName) {
		return _.where($scope.subreddits, {selected: true, name: subredditName}).length > 0;
	};

	$scope.optimisedImageUrls = 0;

	$scope.optimiseImageUrl = function(url) {
		var optimiseUrl = 'https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&resize_w=400&refresh=2592000&url=';
		// var optimiseUrl = 'http://proxy.boxresizer.com/convert?resize=400x9999&source='
		return optimiseUrl + encodeURIComponent(url);
	};

	$scope.isLoading = function() {
		return _.some($scope.subreddits, function(subreddit) { return subreddit.loading; });
	};

	$scope.scrollTop = function() {
		$window.scrollTo(0, 0);
	};

	angular.element($window).bind('scroll', _.throttle(function() {
		var old = $scope.showBackToTop;
		$scope.showBackToTop = $window.scrollY > 30;
		if (old !== $scope.showBackToTop) $scope.$apply();

		if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 500) {
			$scope.loadListings();
		}

	}, 300));

	$scope.loadListings();
}]);
