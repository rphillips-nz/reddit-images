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

	$scope.$watch('subreddits', function() {
		var cleaned = _.map($scope.subreddits, function(subreddit) {
			return {name: subreddit.name, selected: subreddit.selected, searched: false};
		});

		localStorage['subreddits'] = JSON.stringify(cleaned);
	}, true);

	if (localStorage['subreddits']) {
		$scope.subreddits = JSON.parse(localStorage['subreddits']);
	} else {
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

	function isQuickmeme(url) { return (/www\.quickmeme\.com/i).test(url); }
	function isImage(url) { return (/jpg|png|gif|jpeg/i).test(url); }
	function isImgur(url) { return (/imgur\.com/i).test(url); }
	function isImgurAlbum(url) { return (/imgur\.com\/a\//i).test(url); }
	function isImgurBlog(url) { return (/imgur\.com\/blog\//i).test(url); }
	function isFlickr(url) { return (/flickr\.com/i).test(url); }

	var search = function(subreddit) {
		subreddit.searched = true;

		Reddit.get({subreddit: subreddit.name}, function success(result) {
			_.each(result.data.children, function(item, index) {
				item.subreddit = subreddit;
				item.index = index;

				if (isImage(item.data.url)) {
					item.listing_type = 'image';
				} else if (isQuickmeme(item.data.url)) {
					var quickmemeId = item.data.url.match(/http:\/\/www\.quickmeme\.com\/meme\/(.+)\//i);
					if (quickmemeId.length > 0) {
						item.listing_type = 'image';
						item.data.url = 'http://i.qkme.me/' + quickmemeId[1] + '.jpg';
					}
				} else if (isImgurAlbum(item.data.url) || isImgurBlog(item.data.url)) {
					item.listing_type = 'image-album';
				} else if (isImgur(item.data.url) && !(/#\d+/i).test(item.data.url)) { // TODO links to imgur #1, #2 etc
					item.listing_type = 'image';
					item.data.url = item.data.url + '.png';
				} else if (isFlickr(item.data.url)) {
					item.listing_type = 'image-thumbnail';
				} else if (!_.isNull(item.data.media)) {
					item.listing_type = 'media';
				} else if (item.data.is_self) {
					item.listing_type = 'post';
				} else {
					item.listing_type = 'link';
				}

			});

			$scope.items = $scope.items.concat(result.data.children);
		});
	};

	function searchSelected() {
		_.chain($scope.subreddits)
			.where({selected: true, searched: false})
			.each(function(subreddit) { search(subreddit); });
	}

	$scope.toggle = function(subreddit) {
		subreddit.selected = !subreddit.selected;
		searchSelected();
	};

	$scope.addSubreddit = function() {
		var name = $scope.newSubredditName.trim();
		var existing = _.findWhere($scope.subreddits, {name: name});

		if (existing) {
			existing.selected = true;
			search(existing);
		} else if (name !== '') {
			var newSubreddit = {
				name: $scope.newSubredditName,
				selected: true,
				searched: false
			};

			$scope.subreddits.push(newSubreddit);
			search(newSubreddit);
		}

		$scope.newSubredditName = '';
		$scope.addOpen = false;
	};

	$scope.removeSubreddit = function(subreddit) {
		$scope.subreddits = _.reject($scope.subreddits, function(s) { return subreddit === s; });
		$scope.items = _.reject($scope.items, function(i) { return subreddit == i.subreddit; });
	};

	$scope.openSubredditForm = function() {
		$scope.addOpen = true;
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

	$scope.contains = function(list, value) {
		return _.contains(list, value);
	};

	$scope.unescape = function(html) {
		return _.unescape(html);
	};

	searchSelected();

}]);

// reset code...
// localStorage['subreddits'] = JSON.stringify([
//	{name: 'fixedgearbicycle', selected: false},
//	{name: 'gaming', selected: false},
//	{name: 'funny', selected: false},
//	{name: 'gifs', selected: false},
//	{name: 'pictures', selected: false},
//	{name: 'snowboarding', selected: false},
//	{name: 'cats', selected: false},
//	{name: 'aww', selected: false}
// ]);