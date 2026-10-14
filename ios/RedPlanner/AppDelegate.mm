#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

#if DEBUG
#import <EXDevLauncher/EXDevLauncherController.h>
#endif

@interface RedPlannerSceneDelegate : UIResponder <UIWindowSceneDelegate>
@property (nonatomic, strong) UIWindow *window;
@end

@interface AppDelegate ()
@property (nonatomic, copy) NSDictionary *initialLaunchOptions;
- (void)startReactNativeWithLaunchOptions:(NSDictionary *)launchOptions;
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"main";
  self.automaticallyLoadReactNativeWindow = YES;
  self.initialLaunchOptions = launchOptions;

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Scene connection supplies the window and cold-start URL before Expo starts.
  return YES;
}

- (void)startReactNativeWithLaunchOptions:(NSDictionary *)launchOptions
{
  [super application:UIApplication.sharedApplication didFinishLaunchingWithOptions:launchOptions];
}

- (void)loadReactNativeWindow:(NSDictionary *)launchOptions
{
  UIView *rootView = [self.rootViewFactory viewWithModuleName:self.moduleName initialProperties:self.initialProps launchOptions:launchOptions];
  UIViewController *controller = [self createRootViewController];
  [self setRootView:rootView toRootViewController:controller];
  self.window.rootViewController = controller;
  [self.window makeKeyAndVisible];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];
}

// Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  BOOL result = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler] || result;
}

@end

// SDK 27 requires a scene-owned window. Keep Expo's root-view factory and
// delegate subscribers, and preserve URL launch options for cold auth callbacks.
@implementation RedPlannerSceneDelegate

- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) return;
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  NSMutableDictionary *launchOptions = [appDelegate.initialLaunchOptions mutableCopy] ?: [NSMutableDictionary new];
  UIOpenURLContext *context = connectionOptions.URLContexts.anyObject;
  if (context) {
    launchOptions[UIApplicationLaunchOptionsURLKey] = context.URL;
    if (context.options.sourceApplication) launchOptions[UIApplicationLaunchOptionsSourceApplicationKey] = context.options.sourceApplication;
  }
  NSUserActivity *activity = connectionOptions.userActivities.anyObject;
  if (activity) launchOptions[UIApplicationLaunchOptionsUserActivityDictionaryKey] = @{@"UIApplicationLaunchOptionsUserActivityKey": activity};

  self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
  appDelegate.window = self.window;
  BOOL queuedDevelopmentLink = NO;
#if DEBUG
  if ([context.URL.scheme isEqualToString:@"red-planner"]) {
    // Let the dev client reopen its last bundle, then deliver the auth link.
    // Passing an external URL at startup otherwise stops at Expo's launcher.
    NSObject *registry = (NSObject *)[EXDevLauncherController sharedInstance].pendingDeepLinkRegistry;
    [registry setValue:context.URL forKey:@"pendingDeepLink"];
    [launchOptions removeObjectForKey:UIApplicationLaunchOptionsURLKey];
    queuedDevelopmentLink = YES;
  }
#endif
  [appDelegate startReactNativeWithLaunchOptions:launchOptions];
  if (context && !queuedDevelopmentLink) [self scene:scene openURLContexts:connectionOptions.URLContexts];
}

- (void)scene:(UIScene *)scene openURLContexts:(NSSet<UIOpenURLContext *> *)URLContexts
{
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  for (UIOpenURLContext *context in URLContexts) {
    NSMutableDictionary *options = [NSMutableDictionary new];
    if (context.options.sourceApplication) options[UIApplicationOpenURLOptionsSourceApplicationKey] = context.options.sourceApplication;
    options[UIApplicationOpenURLOptionsOpenInPlaceKey] = @(context.options.openInPlace);
    [appDelegate application:UIApplication.sharedApplication openURL:context.URL options:options];
  }
}

- (void)scene:(UIScene *)scene continueUserActivity:(NSUserActivity *)userActivity
{
  [(AppDelegate *)UIApplication.sharedApplication.delegate application:UIApplication.sharedApplication continueUserActivity:userActivity restorationHandler:^(NSArray *objects) {}];
}

- (void)sceneDidBecomeActive:(UIScene *)scene
{
  [(AppDelegate *)UIApplication.sharedApplication.delegate applicationDidBecomeActive:UIApplication.sharedApplication];
}

- (void)sceneWillResignActive:(UIScene *)scene
{
  id<UIApplicationDelegate> delegate = UIApplication.sharedApplication.delegate;
  if ([delegate respondsToSelector:@selector(applicationWillResignActive:)]) [delegate applicationWillResignActive:UIApplication.sharedApplication];
}

- (void)sceneWillEnterForeground:(UIScene *)scene
{
  id<UIApplicationDelegate> delegate = UIApplication.sharedApplication.delegate;
  if ([delegate respondsToSelector:@selector(applicationWillEnterForeground:)]) [delegate applicationWillEnterForeground:UIApplication.sharedApplication];
}

- (void)sceneDidEnterBackground:(UIScene *)scene
{
  id<UIApplicationDelegate> delegate = UIApplication.sharedApplication.delegate;
  if ([delegate respondsToSelector:@selector(applicationDidEnterBackground:)]) [delegate applicationDidEnterBackground:UIApplication.sharedApplication];
}
@end
