angular.module('main', ['ngResource', 'ngCookies'])

.factory('Reddit', ['$resource', function($resource) {
	return $resource(
		'http://www.reddit.com/r/:subreddit/hot.json',
		{subreddit: '@subreddit'},
		{get: {method: 'JSONP', params: {jsonp: 'JSON_CALLBACK'}}}
	);
}])

.controller('MainCtrl', ['$scope', '$cookies', 'Reddit', function($scope, $cookies, Reddit) {
	$scope.items = [];

	$scope.$watch('subreddits', function() {
		$cookies.subreddits = _.pluck(_.where($scope.subreddits, {selected: true}), 'name').toString();
	}, true);

	var defaultSubreddits = [
		'fixedgearbicycle',
		'gaming',
		'funny',
		'gifs',
		'pictures',
		'snowboarding',
		'cats',
		'aww'
	];

	$scope.subreddits = _.map(defaultSubreddits, function(subredditName) {
		return {
			name: subredditName,
			selected: $cookies.subreddits.indexOf(subredditName) >= 0,
			searched: false
		};
	});

	function isImage(url) { return /jpg|png|gif|jpeg/i.test(url); }
	function isImgur(url) { return /imgur\.com/i.test(url); }
	function isImgurAlbum(url) { return /imgur\.com\/(a|gallery)\//i.test(url); }
	function isFlickr(url) { return /flickr\.com/i.test(url); }

	var search = function(subreddit) {
		subreddit.searched = true;

		Reddit.get({subreddit: subreddit.name}, function success(result) {
			_.each(result.data.children, function(item) {
				item.subredditName = subreddit.name;

				if (isImage(item.data.url)) {
					item.listing_type = 'image';
				} else if (isImgurAlbum(item.data.url)) {
					item.listing_type = 'image-thumbnail';
				} else if (isImgur(item.data.url)) {
					item.listing_type = 'image';
					item.data.url = item.data.url + '.png';
				} else if(isFlickr(item.data.url)) {
					item.listing_type = 'image-thumbnail';
				} else {
					item.listing_type = 'post';
				}
			});

			$scope.items = $scope.items.concat(result.data.children);
		});
	}

	function searchSelected() {
		_.chain($scope.subreddits)
			.where({selected: true, searched: false})
			.each(function(subreddit) { search(subreddit); });
	}

	$scope.toggle = function(subreddit) {
		subreddit.selected = !subreddit.selected;
		searchSelected();
	};

	$scope.isSelected = function(subredditName) {
		return _.where($scope.subreddits, {selected: true, name: subredditName}).length > 0;
	};

	$scope.contains = function(list, value) {
		return _.contains(list, value);
	};

	searchSelected();

}]);
