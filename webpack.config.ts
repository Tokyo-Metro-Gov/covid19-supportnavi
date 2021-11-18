import * as path from "path";
import * as webpack from "webpack";
import CopyWebpackPlugin from "copy-webpack-plugin";

const webpackOption: webpack.Configuration = {
  resolve: {
    extensions: ['.ts', '.js'],
  },

  // メインとなるJavaScriptファイル（エントリーポイント）
  entry: {
    main: "./src/main.ts",
    pnavi: "./src/pnavi.ts"
  },

  // ファイルの出力設定
  output: {
    // 出力ファイル名
    path: path.resolve(__dirname, "dist"),
    filename: "scripts/[name].js"
  },
  mode: "development",
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  devServer: {
    static: {
      directory: "./dist"
    },
    compress: true,
    port: 8080
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "./static",
          to: "."
        }
      ]
    })
  ],
  externals: {
    knockout: "ko"
  }
};

module.exports = async (env, argv) => {
  let siteName = "OpenWincovid19 プロジェクト";
  let origin = "https://example.com";
  let googleAnalyticsTagId = "";
  if (env) {
    if (env.siteName) {
      siteName = env.siteName;
    }
    if (env.origin) {
      origin = env.origin;
    }
    if (env.googleAnalyticsTagId) {
      googleAnalyticsTagId = env.googleAnalyticsTagId;
    }
  }

  return webpackOption;
};