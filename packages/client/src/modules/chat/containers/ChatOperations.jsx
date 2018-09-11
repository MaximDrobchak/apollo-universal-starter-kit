import React from 'react';
import PropTypes from 'prop-types';
import { View, KeyboardAvoidingView, Clipboard, Platform, Text, StyleSheet } from 'react-native';
import { GiftedChat, Send } from 'react-native-gifted-chat';

import ChatFooter from '../components/ChatFooter';
import CustomView from '../components/CustomView';
import RenderCustomActions from '../components/RenderCustomActions';
import { Loading, Modal } from '../../common/components/native';
import chatConfig from '../../../../../../config/chat';

export default class ChatOperations extends React.Component {
  static propTypes = {
    loading: PropTypes.bool.isRequired,
    t: PropTypes.func,
    messages: PropTypes.object,
    addMessage: PropTypes.func,
    deleteMessage: PropTypes.func,
    editMessage: PropTypes.func,
    loadData: PropTypes.func.isRequired,
    currentUser: PropTypes.object,
    uuid: PropTypes.string,
    pickImage: PropTypes.func,
    images: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.subscription = null;
    this.gc = React.createRef();
  }

  state = {
    message: '',
    isEdit: false,
    messageInfo: null,
    isQuoted: false,
    quotedMessage: null,
    notify: null
  };

  setMessageState = text => {
    this.setState({ message: text });
  };

  onSend = (messages = []) => {
    const { isEdit, messageInfo, message, quotedMessage } = this.state;
    const { addMessage, editMessage, uuid } = this.props;
    const quotedId = quotedMessage && quotedMessage.hasOwnProperty('id') ? quotedMessage.id : null;
    const defQuote = { filename: null, path: null, text: null, username: null, id: quotedId };

    if (isEdit) {
      editMessage({
        ...messageInfo,
        text: message,
        quotedMessage: quotedMessage ? quotedMessage : defQuote,
        uuid
      }).then(res => this.setState({ notify: res && res.error ? res.error : null }));
      this.setState({ isEdit: false });
    } else {
      const {
        text = null,
        attachment,
        user: { _id: userId, name: username },
        _id: id
      } = messages[0];

      addMessage({
        text,
        username,
        userId,
        id,
        uuid,
        quotedId,
        quotedMessage: quotedMessage ? quotedMessage : defQuote,
        attachment
      }).then(res => this.setState({ notify: res && res.error ? res.error : null }));

      this.setState({ isQuoted: false, quotedMessage: null });
    }
  };

  onLongPress = ({ actionSheet }, currentMessage, id) => {
    const { t, deleteMessage } = this.props;
    const { _id: messageId, text, user } = currentMessage;
    const options = [t('msg.btn.copy'), t('msg.btn.reply')];

    if (id === user._id) {
      options.push(t('msg.btn.edit'), t('msg.btn.delete'));
    }

    actionSheet().showActionSheetWithOptions({ options }, buttonIndex => {
      switch (buttonIndex) {
        case 0:
          Clipboard.setString(text);
          break;

        case 1:
          this.setQuotedState(currentMessage);
          break;

        case 2:
          this.setEditState(currentMessage);
          break;

        case 3:
          deleteMessage(messageId).then(res => this.setState({ notify: res && res.error ? res.error : null }));
          break;
      }
    });
  };

  setEditState = ({ _id: id, text, createdAt, quotedId, user: { _id: userId, name: username } }) => {
    this.setState({ isEdit: true, message: text, messageInfo: { id, text, createdAt, userId, username, quotedId } });
    this.gc.focusTextInput();
  };

  setQuotedState = ({ _id: id, text, path, filename, user: { name: username } }) => {
    this.setState({ isQuoted: true, quotedMessage: { id, text, path, filename, username } });
    this.gc.focusTextInput();
  };

  renderChatFooter = () => {
    if (this.state.isQuoted) {
      const { quotedMessage } = this.state;
      return <ChatFooter {...quotedMessage} undoQuote={this.clearQuotedState} />;
    }
  };

  clearQuotedState = () => {
    this.setState({ isQuoted: false, quotedMessage: null });
  };

  renderCustomView = chatProps => {
    const { images } = this.props;
    return <CustomView {...chatProps} images={images} />;
  };

  renderSend = chatProps => {
    const { t } = this.props;
    return <Send {...chatProps} label={t('input.btn')} />;
  };

  renderCustomActions = chatProps => {
    const { images } = this.props;
    if (images) {
      return <RenderCustomActions {...chatProps} pickImage={this.props.pickImage} />;
    }
  };

  onLoadEarlier = () => {
    const {
      messages: {
        pageInfo: { endCursor }
      },
      loadData
    } = this.props;

    if (this.allowDataLoad) {
      if (this.props.messages.pageInfo.hasNextPage) {
        this.allowDataLoad = false;
        return loadData(endCursor + 1, 'add');
      }
    }
  };

  renderModal = () => {
    const { notify } = this.state;
    if (notify) {
      return (
        <Modal isVisible={!!notify} onBackdropPress={() => this.setState({ notify: null })}>
          <View style={styles.alertTextWrapper}>
            <Text>{notify}</Text>
          </View>
        </Modal>
      );
    }
  };

  render() {
    const { currentUser, uuid, messages, loading, t } = this.props;

    if (loading) {
      return <Loading text={t('loading')} />;
    }

    this.allowDataLoad = true;
    const { message } = this.state;
    const edges = messages ? messages.edges : [];
    const { id = uuid, username = null } = currentUser ? currentUser : {};
    return (
      <View style={{ flex: 1 }}>
        {this.renderModal()}
        <GiftedChat
          {...chatConfig.giftedChat}
          ref={gc => (this.gc = gc)}
          text={message}
          onInputTextChanged={text => this.setMessageState(text)}
          placeholder={t('input.text')}
          messages={edges}
          renderSend={this.renderSend}
          onSend={this.onSend}
          loadEarlier={messages.totalCount > messages.edges.length}
          onLoadEarlier={this.onLoadEarlier}
          user={{ _id: id, name: username }}
          renderChatFooter={this.renderChatFooter}
          renderCustomView={this.renderCustomView}
          renderActions={this.renderCustomActions}
          onLongPress={(context, currentMessage) => this.onLongPress(context, currentMessage, id)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? null : 'padding'} keyboardVerticalOffset={120} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  alertTextWrapper: {
    backgroundColor: '#fff',
    padding: 10
  }
});