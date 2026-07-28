import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { API, graphqlOperation } from "aws-amplify";
import {
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { listStocks, listFeeds } from "./graphql/queries";
import {
  createFeed as createFeedMutation,
  createStock as createStockMutation,
  updateStock as updateStockMutation,
} from "./graphql/mutations";
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";


const App = ({ signOut }) => {
  const dt = new Date();
  const dtString = dt.toLocaleDateString('hu-HU');
  const todayISO = dt.toISOString().split('T')[0];

  const [stocks, setStocks] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [feedsSum, setFeedsSum] = useState([]);

  useEffect(() => {
    fetchStocks();
    fetchFeeds();
  }, []);

  async function fetchStocks() {
    const apiData = await API.graphql(graphqlOperation(listStocks, { filter: {remaining: {ne: 0}} }));
    const stocksFromAPI = apiData.data.listStocks.items;
    setStocks(stocksFromAPI);
  }

  async function fetchFeeds() {
    const apiData = await API.graphql({ query: listFeeds });
    const feedsFromAPI = apiData.data.listFeeds.items;
    setFeeds(feedsFromAPI);

    var summary = feedsFromAPI.reduce(function(obj, feed){
      if (!obj[feed.feedAt]) {
          obj[feed.feedAt] = [`${feed.name} (${feed.comment})`];
      } else {
          obj[feed.feedAt].push(`${feed.name} (${feed.comment})`);
      }
      return obj;
    }, {});
    const dates = Object.keys(summary).sort().reverse();
    let fs = dates.map((dt) => {return { "date": dt, items: summary[dt]}});
    setFeedsSum(fs);
  }

  async function createStock(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const data = {
      name: form.get("name"),
      madeAt: form.get("madeAt"),
      remaining: parseInt(form.get("remaining")),
      comment: form.get('comment')
    };
    await API.graphql({
      query: createStockMutation,
      variables: { input: data },
    });
    fetchStocks();
    event.target.reset();
  }

  async function decreaseStock(stock) {
    const date = new Date();
    stock.remaining -= 1;
    const stockData = {
      id: stock.id,
      remaining: stock.remaining,
    };
    const feedData = {
      feedAt: date.toISOString().split('T')[0],
      name: `${stock.name} (${stock.madeAt})`,
      comment: stock.comment
    };

    let newStocks;
    if(stock.remaining === 0) {
      newStocks = stocks.filter((stck) => stck.id !== stock.id);
    } else {
      newStocks = [...stocks];
    }
    setStocks(newStocks);

    await API.graphql({
      query: updateStockMutation,
      variables: { input: stockData },
    });
    await API.graphql({
      query: createFeedMutation,
      variables: { input: feedData },
    });
    fetchFeeds();
  }

  async function createFeed(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const data = {
      feedAt: form.get("feedAt"),
      name: form.get("name"),
      comment: form.get('comment')
    };
    await API.graphql({
      query: createFeedMutation,
      variables: { input: data },
    });
    fetchFeeds();
    event.target.reset();
  }

  const todaySummary = feedsSum.find((item) => item.date === todayISO);
  const todayItems = todaySummary ? todaySummary.items : [];
  const stockRemaining = stocks.reduce((sum, stock) => sum + (stock.remaining || 0), 0);

  return (
    <View className="App">
      <Flex direction="row" justifyContent="center" wrap="wrap">
        <Heading level={1}>Emma feed tracking app</Heading>
        <Button onClick={signOut}>Sign Out</Button>
      </Flex>
      <View as="form" margin="3rem 0" onSubmit={createStock}>
        <Flex direction="row" justifyContent="center" wrap="wrap">
          <TextField
            name="name"
            placeholder="Stock Name"
            label="Stock Name"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            type="date"
            name="madeAt"
            placeholder="Stock created"
            label="Stock created"
            labelHidden
            variation="quiet"
            required
            defaultValue={dtString}
          />
          <TextField
            type="number"
            name="remaining"
            placeholder="Stock size"
            label="Stock size"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            type="text"
            name="comment"
            placeholder="Comment"
            label="Comment"
            labelHidden
            variation="quiet"
          />
          <Button type="submit" variation="primary">
            Create Stock
          </Button>
        </Flex>
      </View>
      <Heading level={2}>Current Stocks</Heading>
      <View margin="3rem 0">
        {stocks.map((stock) => (
          <Flex
            key={stock.id || stock.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={700}>
              {stock.name}
            </Text>
            <Text as="span">{stock.madeAt}</Text>
            <Text as="span">{stock.remaining}</Text>
            <Text as="span">{stock.comment}</Text>
            <Button variation="link" onClick={() => decreaseStock(stock)}>
              Use
            </Button>
          </Flex>
        ))}
      </View>
      <View as="form" margin="3rem 0" onSubmit={createFeed}>
        <Flex direction="row" justifyContent="center" wrap="wrap">
          <TextField
            type="date"
            name="feedAt"
            placeholder="Feed date"
            label="Feed date"
            labelHidden
            variation="quiet"
            required
            defaultValue={dtString}
          />
          <TextField
            name="name"
            placeholder="Name"
            label="Name"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            type="text"
            name="comment"
            placeholder="Comment"
            label="Comment"
            labelHidden
            variation="quiet"
          />
          <Button type="submit" variation="primary">
            Create Feed
          </Button>
        </Flex>
      </View>
      <Heading level={2}>Feeds</Heading>
      <VerticalTimeline lineColor="">
        {feedsSum.map((item, index) => (
          <React.Fragment key={index}>
            <VerticalTimelineElement
              contentStyle={{
                background: "rgba(120, 120, 120, 0.05)",
                boxShadow: "none",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                textAlign: "left",
                padding: "1.3rem 2rem",
              }}
              contentArrowStyle={{
                borderRight: "0.4rem solid rgba(120, 120, 120, 0.5)",
              }}
              date={item.date}
            >
              <p className="">
                {item.items.map((it, index) => (
                  <>
                    {it}<br/>
                  </>
                ))}
              </p>
            </VerticalTimelineElement>
          </React.Fragment>
        ))}
      </VerticalTimeline>
      <View as="footer" className="App-footer">
        <Heading level={3}>Today ({todayISO})</Heading>
        <Flex direction="row" justifyContent="center" wrap="wrap">
          <Text as="span">
            <Text as="strong" fontWeight={700}>Feeds today:</Text> {todayItems.length}
          </Text>
          <Text as="span">
            <Text as="strong" fontWeight={700}>Stock remaining:</Text> {stockRemaining}
          </Text>
        </Flex>
        {todayItems.length > 0 ? (
          <Flex direction="column" alignItems="center">
            {todayItems.map((it, index) => (
              <Text as="span" key={index}>{it}</Text>
            ))}
          </Flex>
        ) : (
          <Text as="span">No feeds recorded today yet.</Text>
        )}
      </View>
    </View>
  );
};

export default withAuthenticator(App, {hideSignUp:true});