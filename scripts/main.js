angular.module('main', ['ngResource', 'ngSanitize'])

.factory('Reddit', ['$resource', function($resource) {
	return $resource(
		'http://www.reddit.com/r/:subreddit/hot.json',
		{subreddit: '@subreddit'},
		{get: {method: 'JSONP', params: {jsonp: 'JSON_CALLBACK'}}}
	);
}])

.controller('MainCtrl', ['$scope', 'Reddit', function($scope, Reddit) {
	$scope.items = [];

	if (localStorage['subreddits']) {
		$scope.subreddits = JSON.parse(localStorage['subreddits']);
	} else {
		resetDefaultSubreddits();
	}

	$scope.$watch('subreddits', function() {
		localStorage['subreddits'] = JSON.stringify(_.map($scope.subreddits, function(subreddit) {
			return {name: subreddit.name, selected: subreddit.selected, searched: false};
		}));
	}, true);

	var Site = {
		isQuickmeme: function(url) { return (/www\.quickmeme\.com/i).test(url); },
		quickmemeId: function(url) { return url.match(/http:\/\/www\.quickmeme\.com\/meme\/(.+)\//i); },
		isImage: function(url) { return (/jpg|png|gif|jpeg/i).test(url); },
		isImgur: function(url) { return (/imgur\.com/i).test(url); },
		isImgurAlbum: function(url) { return (/imgur\.com\/a\//i).test(url); },
		isImgurBlog: function(url) { return (/imgur\.com\/blog\//i).test(url); },
		isFlickr: function(url) { return (/flickr\.com/i).test(url); }
	};

	function initialiseItem(item) {
		if (Site.isImage(item.data.url)) {
			item.listing_type = 'image';
		} else if (Site.isQuickmeme(item.data.url)) {
			var quickmemeId = Site.quickmemeId(item.data.url);
			if (quickmemeId.length > 0) {
				item.listing_type = 'image';
				item.data.url = 'http://i.qkme.me/' + quickmemeId[1] + '.jpg';
			}
		} else if (Site.isImgurAlbum(item.data.url) || Site.isImgurBlog(item.data.url)) {
			item.listing_type = 'image-album';
		} else if (Site.isImgur(item.data.url) && !(/#\d+/i).test(item.data.url)) { // TODO links to imgur #1, #2 etc
			item.listing_type = 'image';
			item.data.url = item.data.url + '.png';
		} else if (Site.isFlickr(item.data.url)) {
			item.listing_type = 'image-thumbnail';
		} else if (null !== item.data.media) {
			item.listing_type = 'media';
		} else if (item.data.is_self) {
			item.listing_type = 'post';
		} else {
			item.listing_type = 'link';
		}

		return item;
	}

	function resetDefaultSubreddits() {
		$scope.subreddits = [
			{name: 'fixedgearbicycle', selected: false, searched: false},
			{name: 'gaming', selected: false, searched: false},
			{name: 'funny', selected: false, searched: false},
			{name: 'gifs', selected: false, searched: false},
			{name: 'pictures', selected: false, searched: false},
			{name: 'snowboarding', selected: false, searched: false},
			{name: 'cats', selected: false, searched: false},
			{name: 'aww', selected: false, searched: false}
		];
	}

	function search(subreddit) {
		subreddit.searched = true;

		Reddit.get({subreddit: subreddit.name}, function success(result) {
			_.each(result.data.children, function(item, index) {
				initialiseItem(item);
				item.subreddit = subreddit;
				item.index = index;
			});

			$scope.items = $scope.items.concat(result.data.children);
		});
	}

	function searchSelectedSubreddits() {
		_.chain($scope.subreddits)
			.where({selected: true, searched: false})
			.each(function(subreddit) { search(subreddit); });
	}

	$scope.toggleSubreddit = function(subreddit) {
		subreddit.selected = !subreddit.selected;
		searchSelectedSubreddits();
	};

	$scope.addSubreddit = function() {
		var name = $scope.newSubredditName.trim();
		var existing = _.findWhere($scope.subreddits, {name: name});

		if (existing) {
			existing.selected = true;
			search(existing);
		} else if (name !== '') {
			var newSubreddit = {name: $scope.newSubredditName, selected: true, searched: false};
			$scope.subreddits.push(newSubreddit);
			search(newSubreddit);
		}

		$scope.newSubredditName = '';
		$scope.addSubredditOpen = false;
	};

	$scope.removeSubreddit = function(subreddit) {
		$scope.subreddits = _.reject($scope.subreddits, function(s) { return subreddit === s; });
		$scope.items = _.reject($scope.items, function(i) { return subreddit == i.subreddit; });
	};

	$scope.openSubredditForm = function() {
		$scope.addSubredditOpen = true;
		_.defer(function() {
			document.getElementsByClassName('subreddit-name-field')[0].focus();
		});
	};

	$scope.scrollTop = function() {
		$('html, body').animate({ scrollTop: 0 }, 'fast');
	};

	$(window).scroll(_.throttle(function() {
		$scope.showBackToTop = $(window).scrollTop() > $('.main').outerHeight();
		$scope.$apply();
	}, 300));

	$scope.isSelected = function(subredditName) {
		return _.where($scope.subreddits, {selected: true, name: subredditName}).length > 0;
	};

	$scope.unescape = _.unescape;

	searchSelectedSubreddits();

}]);
